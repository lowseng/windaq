// api/log-checkin.js
// Validates checkpoint + GPS proximity, then saves to Airtable

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

  const token           = process.env.AIRTABLE_TOKEN;
  const base            = process.env.AIRTABLE_BASE;
  const logTable        = process.env.AIRTABLE_LOG_TABLE        || 'Patrol Log';
  const checkpointTable = process.env.AIRTABLE_CHECKPOINT_TABLE || 'Checkpoints';

  try {
    // ── STEP 1: Validate checkpoint ID ──────────────────
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
        error: `Invalid checkpoint. This QR code is not recognised.`
      });
    }

    const cp           = validateData.records[0].fields;
    const officialId   = cp['Checkpoint ID'];
    const officialName = cp['Checkpoint Name'];
    const officialZone = cp['Location / Zone'] || '';
    const cpLat        = cp['Latitude'];
    const cpLng        = cp['Longitude'];
    const maxRadius    = cp['Max Radius (m)'] || 50;

    // ── STEP 2: GPS proximity check ──────────────────────
    let distanceMetres = null;
    let proximityStatus = 'no_gps';

    if (cpLat && cpLng) {
      if (!lat || !lng) {
        // Checkpoint has coordinates but guard has no GPS
        return res.status(400).json({
          error: 'GPS location is required for this checkpoint. Please enable location access and try again.'
        });
      }

      distanceMetres = getDistanceMetres(lat, lng, cpLat, cpLng);

      if (distanceMetres > maxRadius) {
        return res.status(400).json({
          error: `You are ${Math.round(distanceMetres)}m away from ${officialName}. You must be within ${maxRadius}m to check in.`
        });
      }

      proximityStatus = 'verified';
    }

    // ── STEP 3: Save to Patrol Log ───────────────────────
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
            'Guard IC':         guardIC      || '',
            'Posting':          guardPost    || '',
            'Checkpoint ID':    officialId,
            'Checkpoint Name':  officialName,
            'Zone':             officialZone,
            'Timestamp':        timestamp || new Date().toISOString(),
            'GPS Latitude':     lat       || null,
            'GPS Longitude':    lng       || null,
            'GPS Accuracy (m)': accuracy  || null,
            'Distance (m)':     distanceMetres ? Math.round(distanceMetres) : null,
            'Proximity':        proximityStatus,
            'Notes':            notes     || '',
          }
        }),
      }
    );

    const saveData = await saveRes.json();
    if (saveData.id) return res.status(200).json({ ok: true, id: saveData.id });
    throw new Error(saveData.error?.message || 'Failed to save');

  } catch (err) {
    console.error('log-checkin error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ── Haversine formula — distance between two GPS points in metres ──
function getDistanceMetres(lat1, lng1, lat2, lng2) {
  const R  = 6371000; // Earth radius in metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
             Math.cos(φ1) * Math.cos(φ2) *
             Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c  = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
