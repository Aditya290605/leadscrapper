// POST /api/search — find businesses without websites
const express = require('express');
const { searchBusinesses, filterNoWebsite } = require('../services/places');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { category, location, maxPages } = req.body;

    if (!category || !location) {
      return res.status(400).json({ error: 'category and location are required' });
    }

    // Cap at 10 pages (200 results) to limit API spend
    const pages = Math.min(parseInt(maxPages) || 5, 10);

    console.log(`[search] "${category}" in "${location}" (up to ${pages} pages)...`);
    const raw = await searchBusinesses(category, location, pages);
    console.log(`[search] Found ${raw.length} total results, filtering...`);

    const leads = filterNoWebsite(raw);
    console.log(`[search] ${leads.length} businesses without a website`);

    res.json({
      total: raw.length,
      filtered: leads.length,
      leads,
    });
  } catch (err) {
    console.error('[search] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
