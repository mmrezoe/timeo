const prisma = require('../../../lib/prisma');
const { initializeGoalStatuses, updateTodayStatuses } = require('../../../lib/goals');
const { getNowUTC } = require('../../../lib/dates');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }
  const { entryId } = req.body;

  // Use UTC for all date operations
  const nowUTC = getNowUTC();

  let updated;
  if (entryId) {
    updated = await prisma.timeEntry.update({ 
      where: { id: Number(entryId) }, 
      data: { end: nowUTC } 
    });
  } else {
    // stop latest running entry
    const running = await prisma.timeEntry.findFirst({ 
      where: { end: null }, 
      orderBy: { start: 'desc' } 
    });
    if (!running) return res.status(400).json({ error: 'no running entry' });
    updated = await prisma.timeEntry.update({ 
      where: { id: running.id }, 
      data: { end: nowUTC } 
    });
  }

  try {
    await updateTodayStatuses();
  } catch (e) {
    console.error("updateTodayStatuses failed:", e);
  }
  res.json(updated);
}
