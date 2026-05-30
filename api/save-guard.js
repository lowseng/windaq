module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, ic, post, phone } = req.body;
  if (!name || !ic || !post || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const token  = process.env.AIRTABLE_TOKEN;
  const base   = process.env.AIRTABLE_BASE;
  const table  = process.env.AIRTABLE_TABLE;

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'Name':          name,
            'IC Staff ID':   ic,
            'Posting':       post,
            'Phone':         phone,
            'Verified':      true,
            'Registered At': new Date().toISOString(),
          }
        }),
      }
    );

    const data = await response.json();
    if (data.id) return res.status(200).json({ ok: true, id: data.id });
    throw new Error(data.error?.message || 'Airtable error');

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
