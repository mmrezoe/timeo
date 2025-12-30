const prisma = require('../../../lib/prisma');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const running = await prisma.timeEntry.findFirst({
    where: { end: null },
    orderBy: { start: 'desc' },
    include: { project: true }
  });

  if (!running) {
    return res.json(null);
  }

  res.json({
    id: running.id,
    projectId: running.projectId,
    projectName: running.project?.name,
    projectColor: running.project?.color,
    start: running.start,
    note: running.note,
  });
}

