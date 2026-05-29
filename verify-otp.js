// api/verify-otp.js
// Deployed on Vercel — checks WhatsApp OTP via Twilio Verify

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code are required' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Code must be 6 digits' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SID;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationChecks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, Code: code }),
      }
    );

    const data = await response.json();

    if (data.status === 'approved') {
      return res.status(200).json({ ok: true });
    }

    // Wrong code or expired
    console.error('Twilio verify error:', data);
    return res.status(400).json({
      error: data.message || 'Invalid or expired code. Please try again.',
    });
  } catch (err) {
    console.error('Network error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
