const prisma = require('../../../lib/prisma');
const { parseUTC } = require('../../../lib/dates');

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'PATCH') {
    const { start, end, projectId, note } = req.body;
    const data = {};
    // Parse dates to UTC
    if (start) data.start = parseUTC(start);
    if (end !== undefined) data.end = end ? parseUTC(end) : null;
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