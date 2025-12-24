const prisma = require('../../../lib/prisma');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }
  const { projectId, note } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  // optional: stop previous running entry to enforce single running timer
  await prisma.timeEntry.updateMany({ where: { end: null }, data: { end: new Date() } });

  const entry = await prisma.timeEntry.create({
    data: { projectId: Number(projectId), start: new Date(), note }
  });
  res.status(201).json(entry);
}
