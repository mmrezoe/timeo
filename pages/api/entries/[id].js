const prisma = require('../../../lib/prisma');

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'PATCH') {
    const { start, end, projectId, note } = req.body;
    const data = {};
    if (start) data.start = new Date(start);
    if (end !== undefined) data.end = end ? new Date(end) : null;
    if (projectId) data.projectId = Number(projectId);
    if (note !== undefined) data.note = note;
    const updated = await prisma.timeEntry.update({
      where: { id: Number(id) },
      data,
      include: { project: true }
    });
    res.json(updated);
  } else if (req.method === 'DELETE') {
    await prisma.timeEntry.delete({ where: { id: Number(id) } });
    res.status(204).end();
  } else {
    res.setHeader('Allow', ['PATCH', 'DELETE']);
    res.status(405).end();
  }
}