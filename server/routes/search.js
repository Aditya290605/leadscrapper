// POST /api/search — find businesses without websites
const express = require('express');
const { searchBusinesses, filterNoWebsite, buildSearchQuery } = require('../services/places');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { query, category, location, maxPages, refresh } = req.body;

    const finalQuery = buildSearchQuery(query, category, location);

    if (!finalQuery) {
      return res.status(400).json({
        error: 'Search term is required (e.g. "turf in Mumbai", "gym in Thane", or category + location)',
      });
    }

    // Cap at 10 pages (200 results) to limit Google Places API spend
    const pages = Math.min(Math.max(parseInt(maxPages, 10) || 3, 1), 10);

    console.log(`[search] Query: "${finalQuery}" (max ${pages} pages, refresh=${!!refresh})...`);
    const raw = await searchBusinesses(finalQuery, pages, !!refresh);
    console.log(`[search] Found ${raw.length} total results, filtering...`);

    const leads = filterNoWebsite(raw);
    console.log(`[search] ${leads.length} businesses without a website`);

    res.json({
      query: finalQuery,
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
