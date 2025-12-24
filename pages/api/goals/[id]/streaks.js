const { getGoalStreak } = require('../../../../lib/goals');

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: 'invalid goal id' });

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const days = Number(req.query.days) || 90;
  try {
    const streak = await getGoalStreak(id, days);
    return res.json({ goalId: id, streak });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
