const prisma = require('../../../lib/prisma');

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'PATCH') {
    const { projectId, minMinutesPerDay } = req.body;
    const data = {};
    if (projectId) data.projectId = Number(projectId);
    if (minMinutesPerDay) data.minMinutesPerDay = Number(minMinutesPerDay);
    const updated = await prisma.goal.update({
      where: { id: Number(id) },
      data,
      include: { project: true }
    });
    res.json(updated);
  } else if (req.method === 'DELETE') {
    await prisma.goal.delete({ where: { id: Number(id) } });
    res.status(204).end();
  } else {
    res.setHeader('Allow', ['PATCH', 'DELETE']);
    res.status(405).end();
  }
}