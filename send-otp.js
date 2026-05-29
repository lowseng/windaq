// api/send-otp.js
// Deployed on Vercel — sends WhatsApp OTP via Twilio Verify

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  // Basic E.164 validation
  const e164 = /^\+[1-9]\d{7,14}$/;
  if (!e164.test(phone)) {
    return res.status(400).json({ error: 'Phone must be in E.164 format, e.g. +60123456789' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return res.status(500).json({ error: 'Server misconfiguration: missing Twilio credentials' });
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          Channel: 'whatsapp',   // <- WhatsApp channel
        }),
      }
    );

    const data = await response.json();

    if (data.status === 'pending') {
      return res.status(200).json({ ok: true, status: data.status });
    }

    // Twilio returned an error
    console.error('Twilio send error:', data);
    return res.status(400).json({
      error: data.message || 'Failed to send OTP. Check the phone number and try again.',
    });
  } catch (err) {
    console.error('Network error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
