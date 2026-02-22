import prisma from '../../lib/prisma';
import { parseUTC } from '../../lib/dates';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const startUTC = parseUTC(startDate);
      const endUTC = parseUTC(endDate);

      // Use overlap (same as review/today): entries that overlap the day range
      const entries = await prisma.timeEntry.findMany({
        where: {
          start: { lt: endUTC },
          OR: [{ end: { gt: startUTC } }, { end: null }],
        },
        include: {
          project: true,
        },
        orderBy: {
          start: 'asc',
        },
      });

      return res.status(200).json(entries);
    } catch (error) {
      console.error('Error fetching entries:', error);
      return res.status(500).json({ error: 'Failed to fetch entries' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
