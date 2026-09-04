// POST /api/email/generate  — AI-generate personalized emails
// POST /api/email/send      — send emails via Gmail SMTP with delay
// GET  /api/email/dnc       — get do-not-contact list
// POST /api/email/dnc       — add to do-not-contact list
// GET  /api/email/stats     — daily send stats
const express = require('express');
const { generateEmail } = require('../services/gemini');
const { sendEmail, getDncList, addToDnc, getSendStats } = require('../services/mailer');

const router = express.Router();

// ── Generate personalized emails for selected leads ─────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { leads, category, city } = req.body;
    if (!leads?.length) return res.status(400).json({ error: 'No leads provided' });
    if (!category || !city) return res.status(400).json({ error: 'category and city are required for personalization' });

    console.log(`[email/generate] Generating emails for ${leads.length} leads...`);

    // Generate in sequence to respect Gemini rate limits (free tier = 15 RPM)
    const drafts = [];
    for (const lead of leads) {
      try {
        const { subject, body } = await generateEmail({
          businessName: lead.name,
          category,
          city,
        });
        drafts.push({ ...lead, subject, body, status: 'draft' });
      } catch (err) {
        console.error(`[email/generate] Failed for ${lead.name}:`, err.message);
        drafts.push({ ...lead, subject: '', body: '', status: 'generation_failed', error: err.message });
      }
    }

    res.json({ drafts });
  } catch (err) {
    console.error('[email/generate] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Send emails with configurable delay between each ────────────────────
router.post('/send', async (req, res) => {
  try {
    const { emails } = req.body; // [{ to, subject, bodyText }]
    if (!emails?.length) return res.status(400).json({ error: 'No emails to send' });

    const delay = parseInt(process.env.EMAIL_DELAY_MS || '3000', 10);
    const results = [];

    console.log(`[email/send] Sending ${emails.length} emails (delay: ${delay}ms)...`);

    for (let i = 0; i < emails.length; i++) {
      const { to, subject, bodyText } = emails[i];

      if (!to || !subject || !bodyText) {
        results.push({ to: to || '(empty)', status: 'failed', reason: 'missing to, subject, or bodyText' });
        continue;
      }

      const result = await sendEmail({ to, subject, bodyText });
      results.push(result);
      console.log(`[email/send] ${i + 1}/${emails.length} → ${result.to}: ${result.status}`);

      // Delay between sends (skip after last one)
      if (i < emails.length - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[email/send] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Do-Not-Contact management ───────────────────────────────────────────
router.get('/dnc', (_req, res) => {
  res.json({ list: getDncList() });
});

router.post('/dnc', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  const list = addToDnc(email);
  res.json({ list });
});

// ── Send stats ──────────────────────────────────────────────────────────
router.get('/stats', (_req, res) => {
  res.json(getSendStats());
});

module.exports = router;
