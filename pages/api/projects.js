const prisma = require('../../lib/prisma');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const projects = await prisma.project.findMany({ orderBy: { name: 'asc' } });
    return res.json(projects);
  }
  if (req.method === 'POST') {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const project = await prisma.project.create({ data: { name, color } });
    return res.status(201).json(project);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
