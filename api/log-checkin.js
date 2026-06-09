// api/log-checkin.js
// Validates checkpoint then saves patrol check-in to Airtable

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

  if (!guardName || !guardPhone || !checkpointId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const token            = process.env.AIRTABLE_TOKEN;
  const base             = process.env.AIRTABLE_BASE;
  const logTable         = process.env.AIRTABLE_LOG_TABLE        || 'Patrol Log';
  const checkpointTable  = process.env.AIRTABLE_CHECKPOINT_TABLE || 'Checkpoints';

  try {
    // ── STEP 1: Validate checkpoint ID against Airtable ──
    const validateUrl = `https://api.airtable.com/v0/${base}/${encodeURIComponent(checkpointTable)}` +
      `?filterByFormula=${encodeURIComponent(
        `AND({Checkpoint ID}="${checkpointId}", {Active}=1)`
      )}&maxRecords=1`;

    const validateRes  = await fetch(validateUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const validateData = await validateRes.json();

    if (!validateData.records || validateData.records.length === 0) {
      return res.status(400).json({
        error: `Invalid checkpoint "${checkpointId}". This QR code is not recognised.`
      });
    }

    // Use official name from Airtable — not from URL (prevents name spoofing too)
    const cpFields         = validateData.records[0].fields;
    const officialId       = cpFields['Checkpoint ID'];
    const officialName     = cpFields['Checkpoint Name'];
    const officialZone     = cpFields['Location / Zone'] || '';

    // ── STEP 2: Save to Patrol Log ──
    const saveRes  = await fetch(
      `https://api.airtable.com/v0/${base}/${encodeURIComponent(logTable)}`,
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
            'Guard IC':         guardIC       || '',
            'Posting':          guardPost     || '',
            'Checkpoint ID':    officialId,
            'Checkpoint Name':  officialName,
            'Zone':             officialZone,
            'Timestamp':        timestamp || new Date().toISOString(),
            'GPS Latitude':     lat       || null,
            'GPS Longitude':    lng       || null,
            'GPS Accuracy (m)': accuracy  || null,
            'Notes':            notes     || '',
          }
        }),
      }
    );

    const saveData = await saveRes.json();
    if (saveData.id) return res.status(200).json({ ok: true, id: saveData.id });
    throw new Error(saveData.error?.message || 'Failed to save to Airtable');

  } catch (err) {
    console.error('log-checkin error:', err);
    return res.status(500).json({ error: err.message });
  }
};
