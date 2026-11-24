// POST /api/search — find businesses without websites
const express = require('express');
const { searchBusinesses, filterNoWebsite, buildSearchQuery } = require('../services/places');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { query, category, location, maxPages, refresh, excludeIds, hideSeen } = req.body;

    const finalQuery = buildSearchQuery(query, category, location);

    if (!finalQuery) {
      return res.status(400).json({
        error: 'Search term is required (e.g. "turf in Mumbai", "gym in Thane", or category + location)',
      });
    }

    // Cap at 10 pages (~200 results) to limit Google Places API spend
    const pages = Math.min(Math.max(parseInt(maxPages, 10) || 3, 1), 10);
    const safeExcludeIds = Array.isArray(excludeIds)
      ? excludeIds.filter((id) => typeof id === 'string' && id.trim()).slice(0, 10000)
      : [];

    console.log(`[search] Query: "${finalQuery}" (max ${pages} pages, refresh=${!!refresh}, seenIds=${safeExcludeIds.length})...`);
    const raw = await searchBusinesses(finalQuery, pages, !!refresh);
    console.log(`[search] Found ${raw.length} unique total results, filtering...`);

    const allLeads = filterNoWebsite(raw, { excludeIds: safeExcludeIds });
    const shouldHideSeen = hideSeen !== false && safeExcludeIds.length > 0;
    const skippedLeads = shouldHideSeen ? allLeads.filter((l) => l.isSeen) : [];
    const leads = shouldHideSeen ? allLeads.filter((l) => !l.isSeen) : allLeads;

    console.log(`[search] ${leads.length} fresh businesses without a website (${skippedLeads.length} already seen skipped)`);

    res.json({
      query: finalQuery,
      total: raw.length,
      filtered: allLeads.length,
      duplicatesSkipped: skippedLeads.length,
      leads,
      skippedLeads,
    });
  } catch (err) {
    console.error('[search] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
