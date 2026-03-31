/* ============================================
   WHATSAPP BOT SERVER — Vida Saludable Guatemala
   Stack: Node.js + Express + Twilio WhatsApp
   ============================================

   SETUP:
   1. cp .env.example .env && fill in credentials
   2. npm install
   3. npm start
   4. Expose port with: ngrok http 3000
   5. Set webhook in Twilio console:
      https://your-ngrok-url.ngrok.io/webhook

   PRODUCTION:
   Deploy to Railway, Render, or any Node host.
   Set environment variables there.
   ============================================ */

'use strict';

require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cron = require('node-cron');
const { processMessage, FOLLOWUP_MESSAGES } = require('./flows');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

// ============================================
// IN-MEMORY STORES
// (replace with Redis / SQLite for production)
// ============================================

/** @type {Object.<string, {state: string, data: object}>} */
const sessions = {};

/** @type {Object.<string, {from: string, name: string, lastActivity: number, followupSent: object}>} */
const leads = {};

// ============================================
// HELPERS
// ============================================
async function sendMessage(to, body) {
  try {
    await twilioClient.messages.create({ from: FROM, to, body });
  } catch (err) {
    console.error(`[send] error to ${to}:`, err.message);
  }
}

function registerLead(from, extraData = {}) {
  leads[from] = {
    from,
    name: extraData.name || '',
    lastActivity: Date.now(),
    followupSent: { tenMinutes: false, nextDay: false, threeDays: false },
    ...extraData,
  };
}

function updateLeadActivity(from) {
  if (leads[from]) leads[from].lastActivity = Date.now();
  else registerLead(from);
}

function saveLead(from, data) {
  // TODO: persist to database (PostgreSQL, Airtable, Google Sheets, etc.)
  console.log('[CRM lead]', { from, ...data, timestamp: new Date().toISOString() });
}

// ============================================
// WEBHOOK — receive WhatsApp messages
// ============================================
app.post('/webhook', async (req, res) => {
  const from = req.body.From;   // e.g. whatsapp:+50212345678
  const body = req.body.Body || '';

  if (!from || !body) {
    return res.status(200).send('<Response></Response>');
  }

  console.log(`[in] ${from}: ${body}`);

  // Update lead activity
  updateLeadActivity(from);

  // Process message through flow engine
  const reply = processMessage(from, body, sessions);

  // Save lead to CRM when order is initiated
  const session = sessions[from];
  if (session?.state === 'collect_location') {
    saveLead(from, {
      selectedProgram: session.data?.selectedProgram,
      stage: 'order_initiated',
    });
  }
  if (session?.state === 'done') {
    saveLead(from, {
      ...session.data,
      stage: 'order_completed',
    });
  }

  // Send reply
  if (reply) {
    await sendMessage(from, reply);
    console.log(`[out] ${from}: ${reply.slice(0, 80)}...`);
  }

  // Twilio expects empty TwiML or proper XML response
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', leads: Object.keys(leads).length, sessions: Object.keys(sessions).length });
});

// ============================================
// MANUAL BROADCAST (internal use)
// POST /broadcast with { to: "whatsapp:+502...", message: "..." }
// Protected by a simple secret header
// ============================================
app.post('/broadcast', async (req, res) => {
  const secret = req.headers['x-bot-secret'];
  if (secret !== process.env.BOT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing to or message' });
  await sendMessage(to, message);
  res.json({ ok: true });
});

// ============================================
// CRM LEADS EXPORT (internal use)
// ============================================
app.get('/leads', (req, res) => {
  const secret = req.headers['x-bot-secret'];
  if (secret !== process.env.BOT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(Object.values(leads));
});

// ============================================
// FOLLOW-UP SCHEDULER
// ============================================

// Every minute: check for inactive leads and send follow-ups
cron.schedule('* * * * *', async () => {
  const now = Date.now();

  for (const [from, lead] of Object.entries(leads)) {
    const minutesSince = (now - lead.lastActivity) / 60000;
    const session = sessions[from];
    const state = session?.state;

    // Skip leads that have completed an order
    if (state === 'done') continue;

    // 10-minute follow-up (only if still in conversation, not completed)
    if (minutesSince >= 10 && !lead.followupSent.tenMinutes) {
      lead.followupSent.tenMinutes = true;
      const msg = FOLLOWUP_MESSAGES.tenMinutes(lead.name);
      await sendMessage(from, msg);
      console.log(`[followup:10min] ${from}`);
    }
  }
});

// Daily at 10:00 AM Guatemala time: next-day follow-up
cron.schedule('0 16 * * *', async () => { // 16:00 UTC = 10:00 AM GT (UTC-6)
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const [from, lead] of Object.entries(leads)) {
    const hoursSince = (now - lead.lastActivity) / 3600000;
    const session = sessions[from];

    if (session?.state === 'done') continue;

    if (hoursSince >= 20 && !lead.followupSent.nextDay) {
      lead.followupSent.nextDay = true;
      const msg = FOLLOWUP_MESSAGES.nextDay(lead.name);
      await sendMessage(from, msg);
      console.log(`[followup:nextday] ${from}`);
    }

    if (hoursSince >= 68 && !lead.followupSent.threeDays) {
      lead.followupSent.threeDays = true;
      const msg = FOLLOWUP_MESSAGES.threeDays(lead.name);
      await sendMessage(from, msg);
      console.log(`[followup:3days] ${from}`);
    }
  }
});

// ============================================
// START
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌿 Vida Saludable Guatemala — WhatsApp Bot`);
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`🔗 Webhook: POST /webhook`);
  console.log(`❤️  Health: GET /health\n`);
});
