const prisma = require("./prisma");
const { dayRangeFromDate, normalizeToLocalMidnight } = require("./dates");

async function computeGoalDayMinutes(goalId, dayStart, dayEnd) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { project: true },
  });
  if (!goal) return 0;
  const projectId = goal.projectId;

  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId: projectId,
      start: { lt: dayEnd },
      OR: [{ end: { gt: dayStart } }, { end: null }],
    },
  });

  let minutes = 0;
  const now = new Date();
  for (const e of entries) {
    const s = e.start instanceof Date ? e.start : new Date(e.start);
    const eEnd = e.end
      ? e.end instanceof Date
        ? e.end
        : new Date(e.end)
      : now;
    const overlapStart = s > dayStart ? s : dayStart;
    const overlapEnd = eEnd < dayEnd ? eEnd : dayEnd;
    if (overlapEnd > overlapStart) {
      minutes += Math.round((overlapEnd - overlapStart) / 60000);
    }
  }
  return minutes;
}

async function cleanupDuplicateDayStatuses(goalId) {
  // Find all dayStatuses for this goal
  const allStatuses = await prisma.goalDayStatus.findMany({
    where: { goalId },
    orderBy: { date: 'asc' }
  });

  // Group by date (normalized to UTC midnight)
  const statusMap = new Map();
  const toDelete = [];

  for (const status of allStatuses) {
    // Normalize date to local midnight for comparison
    const normalizedDate = normalizeToLocalMidnight(status.date);
    const dateKey = normalizedDate.toISOString();

    if (!statusMap.has(dateKey)) {
      statusMap.set(dateKey, status);
    } else {
      // Duplicate found - keep the one with higher minutes or later created
      const existing = statusMap.get(dateKey);
      if (status.minutes > existing.minutes || 
          (status.minutes === existing.minutes && status.createdAt > existing.createdAt)) {
        toDelete.push(existing.id);
        statusMap.set(dateKey, status);
      } else {
        toDelete.push(status.id);
      }
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    await prisma.goalDayStatus.deleteMany({
      where: { id: { in: toDelete } }
    });
  }

  // Update dates to normalized UTC midnight for all remaining
  const remainingStatuses = await prisma.goalDayStatus.findMany({
    where: { goalId }
  });
  
  for (const status of remainingStatuses) {
    const normalizedDate = normalizeToLocalMidnight(status.date);
    if (status.date.getTime() !== normalizedDate.getTime()) {
      await prisma.goalDayStatus.update({
        where: { id: status.id },
        data: { date: normalizedDate }
      });
    }
  }
}

async function initializeGoalStatuses(goalId, daysBack = 90) {
  // Clean up duplicates first
  await cleanupDuplicateDayStatuses(goalId);

  const now = new Date();
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const { start, end } = dayRangeFromDate(date);
    const minutes = await computeGoalDayMinutes(goalId, start, end);
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) return;
    
    const status = minutes >= goal.minMinutesPerDay ? "COMPLETED" : "PENDING";
    
    // Normalize date to local midnight (not UTC) for consistent day comparison
    const normalizedDate = normalizeToLocalMidnight(start);
    
    try {
      await prisma.goalDayStatus.upsert({
        where: { goalId_date: { goalId, date: normalizedDate } },
        update: { status, minutes },
        create: { goalId, date: normalizedDate, status, minutes },
      });
    } catch (e) {
      // ignore upsert race or other transient errors for initialization
      console.error("Error upserting goal day status:", e);
    }
  }
}

async function getGoalStreak(goalId, daysBack = 90) {
  const now = new Date();
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return [];
  const results = [];
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const { start, end } = dayRangeFromDate(date);
    const minutes = await computeGoalDayMinutes(goalId, start, end);

    let status = "pending";
    if (minutes >= goal.minMinutesPerDay) status = "completed";
    else if (minutes > 0) status = "in_progress";

    // Normalize date to local midnight (not UTC) for consistent day comparison
    const normalizedDate = normalizeToLocalMidnight(start);

    // upsert status record (store local midnight as date)
    try {
      await prisma.goalDayStatus.upsert({
        where: { goalId_date: { goalId, date: normalizedDate } },
        update: { status, minutes },
        create: { goalId, date: normalizedDate, status, minutes },
      });
    } catch (e) {
      // ignore transient errors
      console.error("Error upserting goal day status in getGoalStreak:", e);
    }

    results.push({ date: normalizedDate, minutes, status });
  }
  // return newest-first (optional)
  return results;
}

async function computeStreak(goalId) {
  const results = await getGoalStreak(goalId, 90);
  let streak = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "completed") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Update today's status for all goals (call this when day changes or periodically)
async function updateTodayStatuses() {
  const goals = await prisma.goal.findMany({ select: { id: true } });
  const today = new Date();
  const { start, end } = dayRangeFromDate(today);
  const normalizedToday = normalizeToLocalMidnight(start);

  for (const goal of goals) {
    const minutes = await computeGoalDayMinutes(goal.id, start, end);
    const goalData = await prisma.goal.findUnique({ where: { id: goal.id } });
    if (!goalData) continue;

    let status = "PENDING";
    if (minutes >= goalData.minMinutesPerDay) {
      status = "COMPLETED";
    } else if (minutes > 0) {
      status = "IN_PROGRESS";
    }

    try {
      await prisma.goalDayStatus.upsert({
        where: { goalId_date: { goalId: goal.id, date: normalizedToday } },
        update: { status, minutes },
        create: { goalId: goal.id, date: normalizedToday, status, minutes },
      });
    } catch (e) {
      console.error(`Error updating today status for goal ${goal.id}:`, e);
    }
  }
}

module.exports = {
  computeGoalDayMinutes,
  initializeGoalStatuses,
  getGoalStreak,
  computeStreak,
  cleanupDuplicateDayStatuses,
  updateTodayStatuses,
};
