const prisma = require('../../../lib/prisma');
const { getNowUTC, parseUTC } = require('../../../lib/dates');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }
  const { projectId, note, start } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  // Use UTC for all date operations
  const nowUTC = getNowUTC();

  // optional: stop previous running entry to enforce single running timer
  await prisma.timeEntry.updateMany({ 
    where: { end: null }, 
    data: { end: nowUTC } 
  });

  const entry = await prisma.timeEntry.create({
    data: { 
      projectId: Number(projectId), 
      start: start ? parseUTC(start) : nowUTC, 
      note 
    }
  });
  res.status(201).json(entry);
}
