// POST /api/email/template  — Generate customizable master outreach template (email + WhatsApp)
// POST /api/email/generate  — AI-generate personalized emails for specific leads
// POST /api/email/send      — Send emails via Gmail SMTP with delay
// GET  /api/email/dnc       — Get do-not-contact list
// POST /api/email/dnc       — Add to do-not-contact list
// GET  /api/email/stats     — Daily send stats
const express = require('express');
const { generateEmail, generateMasterTemplate } = require('../services/gemini');
const { sendEmail, getDncList, addToDnc, getSendStats } = require('../services/mailer');

const router = express.Router();

// ── Generate master customizable outreach template ──────────────────────
router.post('/template', async (req, res) => {
  try {
    const { query, category, city } = req.body;
    if (!query && !category) {
      return res.status(400).json({ error: 'Search term or category is required to generate a tailored template' });
    }

    console.log(`[email/template] Generating master template for "${category || query}" in "${city || 'area'}"...`);
    const template = await generateMasterTemplate({ query, category, city });
    res.json({ template });
  } catch (err) {
    console.error('[email/template] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Generate personalized emails for selected leads ─────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { leads, category, city } = req.body;
    if (!leads?.length) return res.status(400).json({ error: 'No leads provided' });

    console.log(`[email/generate] Generating emails for ${leads.length} leads...`);

    const drafts = [];
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      try {
        const { subject, body } = await generateEmail({
          businessName: lead.name,
          category: category || lead.category || '',
          city: city || lead.city || '',
        });
        drafts.push({ ...lead, subject, body, status: 'draft' });
      } catch (err) {
        console.error(`[email/generate] Failed for ${lead.name}:`, err.message);
        drafts.push({ ...lead, subject: '', body: '', status: 'generation_failed', error: err.message });
      }

      // Small 500ms breather between requests to prevent hitting Gemini 15 RPM limit
      if (i < leads.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
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
