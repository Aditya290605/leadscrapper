require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' })); // leads arrays can be large

// ── API Routes ───────────────────────────────────────────────────────────
app.use('/api/search', require('./routes/search'));
app.use('/api/export', require('./routes/export'));
app.use('/api/email', require('./routes/email'));
app.use('/api/quota', require('./routes/quota'));

// ── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Serve Frontend in Production ─────────────────────────────────────────
const clientDistPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`  🌐 Serving frontend from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // Handle client-side routing (SPA fallback)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// ── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 LeadScrapper running at http://localhost:${PORT}`);
  console.log(`  📋 Health check: http://localhost:${PORT}/api/health\n`);
});
