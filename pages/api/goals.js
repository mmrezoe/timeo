const prisma = require('../../lib/prisma');
const { initializeGoalStatuses } = require('../../lib/goals');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const goals = await prisma.goal.findMany({ include: { project: true, dayStatuses: { take: 30, orderBy: { date: 'desc' } } } });
    return res.json(goals);
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
