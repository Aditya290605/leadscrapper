require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' })); // leads arrays can be large

// ── Routes ──────────────────────────────────────────────────────────────
app.use('/api/search', require('./routes/search'));
app.use('/api/export', require('./routes/export'));
app.use('/api/email', require('./routes/email'));
app.use('/api/quota', require('./routes/quota'));

// ── Health check ────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 LeadScrapper API running at http://localhost:${PORT}`);
  console.log(`  📋 Health check: http://localhost:${PORT}/api/health\n`);
});
