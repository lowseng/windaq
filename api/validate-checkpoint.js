// api/validate-checkpoint.js
// Checks if a checkpoint ID exists and is active in Airtable

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { checkpointId, checkpointName } = req.body;
  if (!checkpointId) return res.status(400).json({ error: 'Checkpoint ID required' });

  const token = process.env.AIRTABLE_TOKEN;
  const base  = process.env.AIRTABLE_BASE;
  const table = process.env.AIRTABLE_CHECKPOINT_TABLE || 'Checkpoints';

  try {
    // Look for checkpoint ID in Checkpoints table
    const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}` +
      `?filterByFormula=${encodeURIComponent(
        `AND({Checkpoint ID}="${checkpointId}", {Active}=1)`
      )}&maxRecords=1`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(200).json({ valid: false });
    }

    // Return the official name from Airtable (ignores URL name param)
    const fields = data.records[0].fields;
    return res.status(200).json({
      valid: true,
      checkpointId:   fields['Checkpoint ID'],
      checkpointName: fields['Checkpoint Name'],
      zone:           fields['Location / Zone'] || '',
    });

  } catch (err) {
    console.error('validate-checkpoint error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
