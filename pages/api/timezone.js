/**
 * API endpoint to get the app's configured timezone
 * This is needed in frontend because process.env.APP_TIMEZONE is not available in client-side
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  try {
    const timezone = process.env.APP_TIMEZONE || 'UTC';
    return res.json({ timezone });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
