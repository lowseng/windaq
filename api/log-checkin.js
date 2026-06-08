// api/log-checkin.js
// Saves a guard patrol check-in record to Airtable

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    guardName, guardPhone, guardIC, guardPost,
    checkpointId, checkpointName,
    lat, lng, accuracy,
    notes, timestamp
  } = req.body;

  if (!guardName || !guardPhone || !checkpointName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const token = process.env.AIRTABLE_TOKEN;
  const base  = process.env.AIRTABLE_BASE;
  // Use a separate table for patrol logs
  const table = process.env.AIRTABLE_LOG_TABLE || 'Patrol Log';

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          fields: {
            'Guard Name':       guardName,
            'Guard Phone':      guardPhone,
            'Guard IC':         guardIC        || '',
            'Posting':          guardPost      || '',
            'Checkpoint ID':    checkpointId   || '',
            'Checkpoint Name':  checkpointName,
            'Timestamp':        timestamp || new Date().toISOString(),
            'GPS Latitude':     lat      || null,
            'GPS Longitude':    lng      || null,
            'GPS Accuracy (m)': accuracy || null,
            'Notes':            notes    || '',
          }
        }),
      }
    );

    const data = await response.json();
    if (data.id) return res.status(200).json({ ok: true, id: data.id });
    throw new Error(data.error?.message || 'Airtable error');

  } catch (err) {
    console.error('log-checkin error:', err);
    return res.status(500).json({ error: err.message });
  }
};
