const prisma = require('../../lib/prisma');
const { initializeGoalStatuses, updateRecentDayStatuses } = require('../../lib/goals');
const { normalizeToUTCMidnight, getLogicalDayFromUTC, getAppTimeZone } = require('../../lib/dates');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await updateRecentDayStatuses(14);
    } catch (e) {
      console.error("updateRecentDayStatuses failed:", e);
    }
    const goals = await prisma.goal.findMany({ 
      include: { 
        project: true, 
        dayStatuses: { 
          take: 90, 
          orderBy: { date: 'desc' } 
        } 
      } 
    });
    
    // Convert status to lowercase for frontend compatibility
    // Also remove duplicates by date (keep the most recent one)
    // Use normalizeToUTCMidnight to handle dates that weren't normalized before
    const tz = getAppTimeZone();
    const goalsWithLowercaseStatus = goals.map(goal => {
      const uniqueDaysMap = new Map();
      for (const status of goal.dayStatuses) {
        const normalizedDate = normalizeToUTCMidnight(status.date, tz);
        const dateKey = getLogicalDayFromUTC(status.date, tz);
        
        // Keep the most recent entry for each day, or the one with higher minutes if dates are equal
        if (!uniqueDaysMap.has(dateKey)) {
          uniqueDaysMap.set(dateKey, {
            ...status,
            date: normalizedDate, // Use normalized date
            status: status.status.toLowerCase()
          });
        } else {
          const existing = uniqueDaysMap.get(dateKey);
          // Prefer entry with higher minutes, or more recent if minutes are equal
          if (status.minutes > existing.minutes || 
              (status.minutes === existing.minutes && new Date(status.date) > new Date(existing.date))) {
            uniqueDaysMap.set(dateKey, {
              ...status,
              date: normalizedDate, // Use normalized date
              status: status.status.toLowerCase()
            });
          }
        }
      }
      
      // Convert map to array and sort by date descending
      const uniqueDayStatuses = Array.from(uniqueDaysMap.values()).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      return {
        ...goal,
        dayStatuses: uniqueDayStatuses
      };
    });
    
    return res.json(goalsWithLowercaseStatus);
  }
  if (req.method === 'POST') {
    const { projectId, minMinutesPerDay } = req.body;
    if (!projectId || !minMinutesPerDay) return res.status(400).json({ error: 'projectId and minMinutesPerDay required' });
    const goal = await prisma.goal.create({
      data: {
        projectId: Number(projectId),
        minMinutesPerDay: Number(minMinutesPerDay)
      },
      include: { project: true }
    });

    // initialize historical statuses (async, but await here for simplicity)
    await initializeGoalStatuses(goal.id, 90);

    const fresh = await prisma.goal.findUnique({ where: { id: goal.id }, include: { project: true, dayStatuses: true } });
    res.status(201).json(fresh);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end();
  }
}
