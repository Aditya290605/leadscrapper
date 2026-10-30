// GET /api/quota — real-time API quota and usage monitoring
const express = require('express');
const { getPlacesStats } = require('../services/places');
const { getGeminiStats } = require('../services/gemini');
const { getSendStats, getDncList } = require('../services/mailer');

const router = express.Router();

router.get('/', (_req, res) => {
  try {
    const places = getPlacesStats();
    const gemini = getGeminiStats();
    const emailStats = getSendStats();

    const gmailUser = process.env.GMAIL_USER || '';
    const gmailPass = process.env.GMAIL_APP_PASSWORD || '';
    const emailConfigured = !!gmailUser && !!gmailPass && gmailPass !== 'your_16_char_app_password';

    res.json({
      timestamp: new Date().toISOString(),
      places: {
        ...places,
        label: 'Google Places API (New)',
        costModel: '$200 Free Credit Monthly (~90 Text Searches of 100 leads)',
      },
      gemini: {
        ...gemini,
        label: `Google ${gemini.model || 'Gemini 3.5 Flash'}`,
        freeLimitInfo: '15 RPM · 1,000,000 tokens/day free',
      },
      email: {
        configured: emailConfigured,
        account: gmailUser ? gmailUser.replace(/(.{3})(.*)(@.*)/, '$1***$3') : 'Not Configured',
        sentToday: emailStats.sent,
        dailyCap: emailStats.cap,
        remainingToday: Math.max(0, emailStats.cap - emailStats.sent),
        dncCount: getDncList().length,
        delayBetweenSends: `${process.env.EMAIL_DELAY_MS || 3000}ms`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

