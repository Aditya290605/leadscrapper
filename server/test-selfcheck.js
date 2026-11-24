// Comprehensive self-check for backend logic (no external dependencies, assert-based)
const assert = require('assert');
const {
  buildSearchQuery,
  filterNoWebsite,
  formatWhatsAppLink,
  buildBoundingBox,
  splitIntoGrid,
  searchBusinesses,
  clearSearchCache,
} = require('./services/places');
const { generateMasterTemplate, renderTemplateForLead } = require('./services/gemini');

async function runSelfChecks() {
  console.log('Running backend self-checks...');

  // 1. Query builder checks
  assert.strictEqual(
    buildSearchQuery('turf in mumbai', '', ''),
    'turf in mumbai',
    'Direct query should be preserved'
  );

  assert.strictEqual(
    buildSearchQuery('', 'gyms', 'Thane'),
    'gyms in Thane',
    'Category and location should be joined'
  );

  assert.strictEqual(
    buildSearchQuery('', 'turf in mumbai', 'mumbai'),
    'turf in mumbai',
    'Duplicate location should be avoided'
  );

  assert.strictEqual(
    buildSearchQuery('', 'hospital dentist', ''),
    'hospital dentist',
    'Standalone category should work'
  );

  // 2. WhatsApp link generator checks
  assert.strictEqual(
    formatWhatsAppLink('+91 98765 43210'),
    'https://wa.me/919876543210',
    'Indian phone number should format cleanly'
  );

  assert.strictEqual(
    formatWhatsAppLink('9876543210'),
    'https://wa.me/919876543210',
    '10-digit number should prepend 91 country code'
  );

  assert.strictEqual(
    formatWhatsAppLink('085917 22823'),
    'https://wa.me/918591722823',
    'Number with leading zero (STD/trunk prefix) should strip zero and add 91'
  );

  assert.strictEqual(
    formatWhatsAppLink('+91 088286 09966'),
    'https://wa.me/918828609966',
    'Number with +91 0 should strip the 0 after country code'
  );

  // 3. filterNoWebsite + deduplication + seen-ID tagging checks
  const mockPlaces = [
    {
      id: 'place_1',
      displayName: { text: 'Mumbai Turf Club' },
      formattedAddress: 'Mahalaxmi, Mumbai',
      nationalPhoneNumber: '022 1234 5678',
      rating: 4.5,
      userRatingCount: 120,
      googleMapsUri: 'https://maps.google.com/?cid=1',
      websiteUri: 'https://mumbaiturf.com', // Has website -> SHOULD BE EXCLUDED
    },
    {
      id: 'place_2',
      displayName: { text: 'Power Gym Thane' },
      formattedAddress: 'Naupada, Thane West',
      nationalPhoneNumber: '9876543210',
      rating: 4.2,
      userRatingCount: 45,
      googleMapsUri: 'https://maps.google.com/?cid=2',
      websiteUri: null, // No website -> SHOULD BE INCLUDED
    },
    {
      id: 'place_2', // Duplicate ID -> SHOULD BE DEDUPLICATED
      displayName: { text: 'Power Gym Thane' },
      formattedAddress: 'Naupada, Thane West',
      nationalPhoneNumber: '9876543210',
      rating: 4.2,
      userRatingCount: 45,
      googleMapsUri: 'https://maps.google.com/?cid=2',
      websiteUri: null,
    },
    {
      id: 'place_3',
      displayName: { text: 'Kickoff Turf' },
      formattedAddress: 'Andheri West, Mumbai',
      nationalPhoneNumber: '9876500000',
      rating: 4.6,
      userRatingCount: 80,
      googleMapsUri: 'https://maps.google.com/?cid=3',
      websiteUri: '',
    },
  ];

  const filtered = filterNoWebsite(mockPlaces, { excludeIds: ['place_3'] });
  assert.strictEqual(filtered.length, 2, 'Should keep 2 unique places without a website');
  assert.strictEqual(filtered[0].name, 'Power Gym Thane');
  assert.strictEqual(filtered[0].isSeen, false);
  assert.strictEqual(filtered[0].mapsUrl, 'https://maps.google.com/?cid=2');
  assert.strictEqual(filtered[0].whatsappUrl, 'https://wa.me/919876543210');
  assert(filtered[0].instagramSearchUrl.includes('Power%20Gym%20Thane'), 'Instagram search URL should encode business name');
  assert.strictEqual(filtered[1].id, 'place_3');
  assert.strictEqual(filtered[1].isSeen, true, 'Previously seen place ID should be flagged isSeen');

  // 4. Geographic bounding box & grid tiling checks
  const cityPoints = Array.from({ length: 20 }, (_, i) => ({
    location: { latitude: 19.0 + i * 0.01, longitude: 72.8 + i * 0.01 },
  }));
  // Add 1 wild outlier far away to confirm trimming
  cityPoints.push({ location: { latitude: 28.6, longitude: 77.2 } });
  const bbox = buildBoundingBox(cityPoints);
  assert(bbox && bbox.highLat < 21, 'Outlier point should be trimmed from bounding box');
  const tiles2x2 = splitIntoGrid(bbox, 2, 2);
  const tiles3x3 = splitIntoGrid(bbox, 3, 3);
  assert.strictEqual(tiles2x2.length, 4, '2x2 grid should produce 4 tiles');
  assert.strictEqual(tiles3x3.length, 9, '3x3 grid should produce 9 tiles');
  for (const t of tiles3x3) {
    assert(t.low.latitude < t.high.latitude && t.low.longitude < t.high.longitude, 'Tile rectangle bounds must be valid');
  }

  // 5. Progressive cache + >60 geographic tiling searchBusinesses check (mocked fetch)
  const prevKey = process.env.GOOGLE_PLACES_API_KEY;
  const prevFetch = global.fetch;
  process.env.GOOGLE_PLACES_API_KEY = 'test-key';
  clearSearchCache();

  let fetchCalls = 0;
  let tileRequests = 0;
  global.fetch = async (_url, init) => {
    fetchCalls++;
    const body = JSON.parse(init.body);
    const isTile = !!body.locationRestriction;
    if (isTile) tileRequests++;

    const pageIdx = body.pageToken ? parseInt(body.pageToken.split('_')[1], 10) : 0;
    const prefix = isTile
      ? `tile_${body.locationRestriction.rectangle.low.latitude}_${body.locationRestriction.rectangle.low.longitude}`
      : 'base';

    const places = Array.from({ length: 20 }, (_, idx) => {
      // Simulate 5 overlapping places from base inside each tile to test dedup
      const id = isTile && idx < 5 ? `base_0_${idx}` : `${prefix}_${pageIdx}_${idx}`;
      return {
        id,
        displayName: { text: `Turf ${id}` },
        formattedAddress: 'Mumbai',
        location: { latitude: 19.05 + (idx % 10) * 0.02, longitude: 72.82 + (idx % 10) * 0.02 },
      };
    });

    // Google hard cap: max 3 pages (0, 1, 2) per single query
    const nextPageToken = pageIdx < 2 ? `${prefix}_${pageIdx + 1}` : undefined;
    return {
      ok: true,
      json: async () => ({ places, nextPageToken }),
    };
  };

  try {
    // a) First search at ~60 (3 pages) -> 3 API calls, 60 results
    const res60 = await searchBusinesses('turf in mumbai', 3, false, { pageDelayMs: 0 });
    assert.strictEqual(res60.length, 60, '3-page scan should return 60 unique places');
    assert.strictEqual(fetchCalls, 3, '3-page scan should make 3 API calls');

    // b) Repeat smaller volume with messy spacing -> 0 new API calls (cache hit)
    const res20 = await searchBusinesses('  Turf   in Mumbai ', 1, false, { pageDelayMs: 0 });
    assert.strictEqual(res20.length, 20, '1-page cached scan should slice to 20 places');
    assert.strictEqual(fetchCalls, 3, 'Repeated lower-volume query must hit cache with 0 API calls');

    // c) Upgrade same query to ~200 (10 pages) -> skips base 3 pages, tiles to reach 200 unique places!
    const callsBeforeUpgrade = fetchCalls;
    const res200 = await searchBusinesses('turf in mumbai', 10, false, { pageDelayMs: 0 });
    assert(res200.length >= 200, `200-lead scan should break past 60 via tiling (got ${res200.length})`);
    assert(tileRequests > 0, '200-lead scan must issue locationRestriction tile requests');
    assert(fetchCalls - callsBeforeUpgrade <= 20, 'Tile calls must respect safety cap');
    assert.strictEqual(new Set(res200.map((p) => p.id)).size, res200.length, 'All tiled results must be unique by place ID');

    // d) Re-running ~100 after ~200 -> 0 new API calls (cache hit)
    const callsAfter200 = fetchCalls;
    const res100 = await searchBusinesses('turf in mumbai', 5, false, { pageDelayMs: 0 });
    assert.strictEqual(res100.length, 100, 'Cached 100-lead scan should return 100 places');
    assert.strictEqual(fetchCalls, callsAfter200, 'Lower volume after 200 scan must hit cache with 0 API calls');
  } finally {
    global.fetch = prevFetch;
    if (prevKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = prevKey;
    clearSearchCache();
  }

  // 6. Outreach Template generator checks (fallback / structure test)
  const template = await generateMasterTemplate({ query: 'turf in mumbai', category: 'turf', city: 'Mumbai' });
  assert(template.subjectLines && template.subjectLines.length >= 2, 'Should provide at least 2 subject line options');
  assert(template.emailBody && template.emailBody.includes('{{business_name}}'), 'Email body must have {{business_name}} placeholder');
  assert(template.whatsappMessage && template.whatsappMessage.includes('{{business_name}}'), 'WhatsApp pitch must have {{business_name}} placeholder');
  assert(template.talkingPoints && template.talkingPoints.length > 0, 'Must provide talking points');

  // 5. Template rendering check
  const rendered = renderTemplateForLead(template.emailBody, { name: 'Super Kick Turf', city: 'Mumbai', ownerName: 'Aditya' });
  assert(rendered.includes('Super Kick Turf'), 'Rendered template must contain actual business name');
  assert(!rendered.includes('{{business_name}}'), 'Placeholders should be completely replaced');

  console.log('✅ All backend self-checks passed successfully!');
}

runSelfChecks().catch((err) => {
  console.error('❌ Self-check failed:', err);
  process.exit(1);
});

