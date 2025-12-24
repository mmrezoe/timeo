const prisma = require('../../../lib/prisma');
const { initializeGoalStatuses } = require('../../../lib/goals');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }
  const { entryId } = req.body;

  let updated;
  if (entryId) {
    updated = await prisma.timeEntry.update({ where: { id: Number(entryId) }, data: { end: new Date() } });
  } else {
    // stop latest running entry
    const running = await prisma.timeEntry.findFirst({ where: { end: null }, orderBy: { start: 'desc' } });
    if (!running) return res.status(400).json({ error: 'no running entry' });
    updated = await prisma.timeEntry.update({ where: { id: running.id }, data: { end: new Date() } });
  }

  // Update goal statuses for all goals (async, don't await)
  prisma.goal.findMany().then(goals => {
    goals.forEach(g => initializeGoalStatuses(g.id, 1)); // update last day
  });

  res.json(updated);
}
