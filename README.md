# Guard Registration — WhatsApp OTP

Full-stack guard onboarding system: polished web frontend + Vercel serverless backend.
Guards verify their WhatsApp once; all future patrol scans are instant.

---

## Project structure

```
guard-registration/
├── api/
│   ├── send-otp.js       ← Vercel serverless: sends WhatsApp OTP via Twilio Verify
│   └── verify-otp.js     ← Vercel serverless: checks OTP code
├── public/
│   └── index.html        ← Registration web app (deploy as static)
├── package.json
└── README.md
```

---

## Prerequisites

1. **Twilio account** — twilio.com (free trial works)
2. **WhatsApp Business Account (WABA)** — required since March 2024
3. **Vercel account** — vercel.com (free)
4. **Airtable account** — airtable.com (free tier)

---

## Step 1 — Twilio: Create a Verify Service

1. Log in to console.twilio.com
2. Go to **Explore Products → Verify**
3. Click **Create new Service** → name it "Guard Patrol OTP"
4. Note the **Service SID** (starts with `VA...`)
5. Under your account dashboard, note **Account SID** and **Auth Token**

---

## Step 2 — Twilio: Set up WhatsApp Business Sender

> ⚠️ Since March 2024, you must use your own WhatsApp Business number.
> Twilio's generic sender is no longer available.

**Option A — Use Twilio's WhatsApp Sandbox (testing only)**
1. Go to Explore Products → Messaging → Try it out → Send a WhatsApp message
2. Follow the sandbox join instructions (send a join code from your phone)
3. Use `channel: 'whatsapp'` in the API — sandbox handles delivery
4. Limited to pre-approved sandbox numbers; not for production

**Option B — Production WhatsApp Business number**
1. Go to console.twilio.com → Messaging → Senders → WhatsApp Senders
2. Click "Add New Sender" and follow Meta's WhatsApp Business Account setup
3. You'll need a phone number that's NOT already a personal WhatsApp
4. Meta approval takes 1–3 business days
5. Once approved, link it to your Verify Service:
   - Go to Verify → your service → WhatsApp Configuration
   - Select your approved sender

---

## Step 3 — Airtable: Create Guards table

In your Airtable base, create a table called **Guards** with these fields:

| Field name     | Type           |
|----------------|----------------|
| Name           | Single line    |
| IC Staff ID    | Single line    |
| Posting        | Single line    |
| Phone          | Phone number   |
| Verified       | Checkbox       |
| Registered At  | Date/time      |
| Channel        | Single line    |

Get your:
- **Base ID**: from the Airtable URL (`airtbXXXXXXX`)
- **Personal Access Token**: airtable.com/create/tokens with `data.records:write`

---

## Step 4 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# In the project root
cd guard-registration
vercel

# Follow prompts. When asked about output directory, leave default.
# Set environment variables:
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_VERIFY_SID

# Redeploy with env vars
vercel --prod
```

Your backend URL will be something like: `https://guard-registration-xyz.vercel.app`

---

## Step 5 — Update frontend config

Open `public/index.html` and update the config block at the top of the `<script>`:

```js
const BACKEND        = 'https://your-app.vercel.app'; // your Vercel URL
const AIRTABLE_TOKEN = 'YOUR_AIRTABLE_TOKEN';
const AIRTABLE_BASE  = 'YOUR_BASE_ID';
const TABLE_GUARDS   = 'Guards';
```

Deploy the `public/index.html` file to Vercel (it's served as a static file automatically)
or host it separately on Netlify / GitHub Pages.

---

## How it works

1. Guard opens the registration page on their phone
2. Enters: Name, IC/Staff ID, Posting, WhatsApp number
3. Taps "Send WhatsApp OTP" → Twilio sends a 6-digit code to their WhatsApp
4. Guard enters the code → backend verifies with Twilio
5. Guard confirms details → record saved to Airtable
6. Phone is flagged as registered in localStorage
7. All future patrol QR scans skip registration entirely

---

## Cost estimate (Malaysia)

| Item                    | Cost              |
|-------------------------|-------------------|
| Twilio Verify fee       | $0.05/attempt     |
| WhatsApp delivery       | ~$0.005/message   |
| **Total per guard**     | **~$0.055**       |
| 20 guards               | ~$1.10 total      |
| Free trial credit       | $15 (covers ~270) |

---

## Security notes

- OTP expires in 10 minutes (Twilio default)
- Maximum 5 wrong attempts before lockout (Twilio default)
- Resend button has 60-second cooldown
- `guard_verified` flag only set after backend confirms Twilio approval
- Guard identity stored in `localStorage` — tied to the specific phone/browser
- Airtable record created server-side only after successful verification
