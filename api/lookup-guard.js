// api/lookup-guard.js
// Looks up a guard in Airtable by phone number after OTP is verified

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  const token = process.env.AIRTABLE_TOKEN;
  const base  = process.env.AIRTABLE_BASE;
  const table = process.env.AIRTABLE_TABLE;

  try {
    // Search Airtable for a record matching this phone number
    const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}` +
      `?filterByFormula=${encodeURIComponent(`{Phone}="${phone}"`)}` +
      `&maxRecords=1`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(200).json({ found: false });
    }

    const fields = data.records[0].fields;
    return res.status(200).json({
      found: true,
      name:  fields['Name']        || '',
      ic:    fields['IC Staff ID'] || '',
      post:  fields['Posting']     || '',
      phone: fields['Phone']       || phone,
    });

  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
