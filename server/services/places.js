// Google Places API (New) — Text Search + field filtering
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

// Request these fields from Text Search including nextPageToken for pagination
// and location for geographic grid tiling when scanning > 60 results
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.location',
  'nextPageToken',
].join(',');

// Simple in-memory cache keyed by normalized query (shared across scan volumes)
// Format: normalizedQuery -> { places, maxPagesFetched, exhausted, expiresAt } (TTL: 1 hour)
const searchCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const GOOGLE_SINGLE_QUERY_MAX_PAGES = 3; // Google Places Text Search hard cap: 3 pages (60 results)

const placesStats = { liveCalls: 0, cacheHits: 0 };

function normalizeQuery(textQuery) {
  return (textQuery || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function placeKey(p) {
  if (p?.id) return p.id;
  const name = (p?.displayName?.text || '').trim().toLowerCase();
  const addr = (p?.formattedAddress || '').trim().toLowerCase();
  return `${name}|${addr}`;
}

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry;
}

function setCache(key, entry) {
  if (searchCache.size >= MAX_CACHE_ENTRIES && !searchCache.has(key)) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(key, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS });
}

function clearSearchCache() {
  searchCache.clear();
}

function getPlacesStats() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const configured = !!apiKey && apiKey !== 'your_places_api_key_here';
  return {
    configured,
    liveCalls: placesStats.liveCalls,
    cacheHits: placesStats.cacheHits,
    cachedQueries: searchCache.size,
    freeTierMonthlyCredit: '$200.00 / month (~90-100 searches)',
    costPerRequest: '~$0.035 / Text Search page',
  };
}

/**
 * Normalizes query and location into a clean text query string.
 */
function buildSearchQuery(query, category, location) {
  if (query && query.trim()) {
    return query.trim();
  }
  const cat = (category || '').trim();
  const loc = (location || '').trim();

  if (cat && loc) {
    if (cat.toLowerCase().includes(loc.toLowerCase())) {
      return cat;
    }
    return `${cat} in ${loc}`;
  }
  return cat || loc;
}

/**
 * Clean phone number to valid international digits for WhatsApp links.
 * Properly handles Indian national format (085917..., +91..., 022...).
 */
function formatWhatsAppLink(phone) {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 8) return '';

  // Handle +91 0... (trunk prefix after country code)
  if (digits.startsWith('910')) {
    digits = '91' + digits.slice(3);
  }

  // Strip leading zeros (e.g. 08591722823 -> 8591722823)
  digits = digits.replace(/^0+/, '');

  // 10-digit Indian mobile/local number -> prepend 91
  if (digits.length === 10) {
    return `https://wa.me/91${digits}`;
  }

  // Already 12 digits starting with 91
  if (digits.startsWith('91') && digits.length === 12) {
    return `https://wa.me/${digits}`;
  }

  // If longer than 10 digits and not starting with 91, take last 10 digits
  if (digits.length > 10 && !digits.startsWith('91')) {
    return `https://wa.me/91${digits.slice(-10)}`;
  }

  return `https://wa.me/${digits.startsWith('91') ? digits : '91' + digits}`;
}

/**
 * Build a geographic bounding box from place coordinates, trimming extreme outliers
 * so a single mis-located result does not stretch tiles across an entire state.
 */
function buildBoundingBox(places) {
  const points = [];
  for (const p of places) {
    const lat = p?.location?.latitude;
    const lng = p?.location?.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({ lat, lng });
    }
  }
  if (points.length === 0) return null;

  const lats = points.map((pt) => pt.lat).sort((a, b) => a - b);
  const lngs = points.map((pt) => pt.lng).sort((a, b) => a - b);

  const trim = points.length >= 10 ? Math.floor(points.length * 0.05) : 0;
  let minLat = lats[trim];
  let maxLat = lats[lats.length - 1 - trim];
  let minLng = lngs[trim];
  let maxLng = lngs[lngs.length - 1 - trim];

  // Ensure a usable minimum span (~6.5 km) when points are tightly clustered
  const minSpan = 0.06;
  if (maxLat - minLat < minSpan) {
    const mid = (minLat + maxLat) / 2;
    minLat = mid - minSpan / 2;
    maxLat = mid + minSpan / 2;
  }
  if (maxLng - minLng < minSpan) {
    const mid = (minLng + maxLng) / 2;
    minLng = mid - minSpan / 2;
    maxLng = mid + minSpan / 2;
  }

  // Pad by 10% on each side so edge businesses outside the initial 60 are covered
  const padLat = (maxLat - minLat) * 0.1;
  const padLng = (maxLng - minLng) * 0.1;

  const lowLat = Math.max(-89.9, minLat - padLat);
  const highLat = Math.min(89.9, maxLat + padLat);
  let lowLng = Math.max(-179.9, minLng - padLng);
  let highLng = Math.min(179.9, maxLng + padLng);

  // Google Places rectangle restriction requires longitude span < 180 degrees
  if (highLng - lowLng >= 179) {
    const mid = (lowLng + highLng) / 2;
    lowLng = Math.max(-179.9, mid - 89);
    highLng = Math.min(179.9, mid + 89);
  }

  return { lowLat, highLat, lowLng, highLng };
}

/**
 * Split a bounding box into a rows x cols array of Google Places rectangle objects.
 */
function splitIntoGrid(bbox, rows, cols) {
  const latStep = (bbox.highLat - bbox.lowLat) / rows;
  const lngStep = (bbox.highLng - bbox.lowLng) / cols;
  const tiles = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        low: {
          latitude: Number((bbox.lowLat + r * latStep).toFixed(6)),
          longitude: Number((bbox.lowLng + c * lngStep).toFixed(6)),
        },
        high: {
          latitude: Number((bbox.lowLat + (r + 1) * latStep).toFixed(6)),
          longitude: Number((bbox.lowLng + (c + 1) * lngStep).toFixed(6)),
        },
      });
    }
  }
  return tiles;
}

/**
 * Fetch up to 3 pages (Google's single-query ceiling) for one Text Search query
 * or one geographic tile.
 */
async function fetchTextSearchPages({
  textQuery,
  apiKey,
  maxPages,
  locationRestriction = null,
  pageDelayMs = 1000,
  onPage = null,
}) {
  const pageCap = Math.min(maxPages, GOOGLE_SINGLE_QUERY_MAX_PAGES);
  const fetched = [];
  let pageToken = null;
  let callsMade = 0;

  for (let page = 0; page < pageCap; page++) {
    const body = { textQuery, pageSize: 20 };
    if (locationRestriction) body.locationRestriction = locationRestriction;
    if (pageToken) body.pageToken = pageToken;

    placesStats.liveCalls++;
    callsMade++;
    const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      let parsedErr = err;
      try {
        const json = JSON.parse(err);
        if (json.error?.message) parsedErr = json.error.message;
      } catch {}
      throw new Error(`Google Places API error (${res.status}): ${parsedErr}`);
    }

    const data = await res.json();
    const pagePlaces = Array.isArray(data.places) ? data.places : [];
    fetched.push(...pagePlaces);

    if (onPage && onPage(pagePlaces) === false) {
      break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) {
      break;
    }

    // Small delay between page requests to allow token activation (skip after last page)
    if (page < pageCap - 1 && pageDelayMs > 0) {
      await new Promise((r) => setTimeout(r, pageDelayMs));
    }
  }

  return { places: fetched, exhausted: !pageToken, callsMade };
}

/**
 * Search for businesses via Places Text Search (New).
 * Google caps a single text query at 3 pages (60 results). When maxPages > 3,
 * this splits the discovered area into geographic sub-tiles (2x2 for ~100, 3x3 for ~200)
 * using locationRestriction and deduplicates by place.id.
 * @param {string} textQuery — e.g. "turf in Mumbai" or "gym in Thane"
 * @param {number} maxPages — scan depth (1=~20, 3=~60, 5=~100, 10=~200)
 * @param {boolean} bypassCache — skip cache if true
 * @param {object} options — optional overrides (e.g. pageDelayMs for tests)
 * @returns {Array} deduplicated raw place objects from the API
 */
async function searchBusinesses(textQuery, maxPages = 5, bypassCache = false, options = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'your_places_api_key_here') {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured in server/.env. Please add your Google Cloud Places API key.');
  }

  const pageDelayMs = options.pageDelayMs ?? 1000;
  const targetCount = maxPages * 20;
  const normalizedQuery = normalizeQuery(textQuery);
  const cached = !bypassCache ? getCached(normalizedQuery) : null;

  // Full cache hit: already fetched at least this depth, have enough places, or area is exhausted
  if (cached && (cached.places.length >= targetCount || cached.exhausted || cached.maxPagesFetched >= maxPages)) {
    placesStats.cacheHits++;
    console.log(`[places] Cache hit for "${normalizedQuery}" (${cached.places.length} cached, returning up to ${targetCount})`);
    return cached.places.slice(0, targetCount);
  }

  const seenById = new Map();
  const addPlaces = (list) => {
    for (const p of list) {
      const key = placeKey(p);
      if (key && !seenById.has(key)) {
        seenById.set(key, p);
      }
    }
  };

  // Progressive cache seed: reuse already-fetched places instead of paying for base pages again
  if (cached?.places?.length) {
    addPlaces(cached.places);
  }

  const skipBaseSearch = !!(cached && cached.maxPagesFetched >= GOOGLE_SINGLE_QUERY_MAX_PAGES && seenById.size > 0);
  let baseTooSparse = false;

  if (!skipBaseSearch) {
    const base = await fetchTextSearchPages({
      textQuery,
      apiKey,
      maxPages: Math.min(maxPages, GOOGLE_SINGLE_QUERY_MAX_PAGES),
      pageDelayMs,
      onPage: (pagePlaces) => {
        addPlaces(pagePlaces);
        return seenById.size < targetCount;
      },
    });
    // If even the first page wasn't full (< 20 results), tiling won't uncover 100+ places
    baseTooSparse = base.exhausted && base.places.length < 20;
  } else {
    console.log(`[places] Reusing ${seenById.size} cached base results for "${normalizedQuery}", tiling for more...`);
  }

  let fullyExhausted = baseTooSparse;

  // Geographic grid tiling to break past Google's 60-result single-query cap
  if (maxPages > GOOGLE_SINGLE_QUERY_MAX_PAGES && !baseTooSparse && seenById.size < targetCount) {
    const bbox = buildBoundingBox(Array.from(seenById.values()));
    if (bbox) {
      const gridDim = maxPages <= 5 ? 2 : 3; // 2x2 for ~100, 3x3 for ~200
      const tiles = splitIntoGrid(bbox, gridDim, gridDim);
      // ponytail: cap tile API calls at 2x maxPages to prevent runaway Places API spend on sparse cities; raise or make configurable if deeper sweeps are needed.
      const maxTileCalls = maxPages * 2;
      let tileCalls = 0;

      console.log(`[places] Tiling "${normalizedQuery}" into ${gridDim}x${gridDim} grid (have ${seenById.size}, target ${targetCount})...`);

      for (const rect of tiles) {
        if (seenById.size >= targetCount || tileCalls >= maxTileCalls) break;

        const remainingBudget = maxTileCalls - tileCalls;
        const tileRes = await fetchTextSearchPages({
          textQuery,
          apiKey,
          maxPages: Math.min(GOOGLE_SINGLE_QUERY_MAX_PAGES, remainingBudget),
          locationRestriction: { rectangle: rect },
          pageDelayMs,
          onPage: (pagePlaces) => {
            addPlaces(pagePlaces);
            return seenById.size < targetCount;
          },
        });
        tileCalls += tileRes.callsMade;
      }

      if (gridDim >= 3 && seenById.size < targetCount && tileCalls < maxTileCalls) {
        fullyExhausted = true;
      }
      console.log(`[places] Tiling complete for "${normalizedQuery}": ${seenById.size} unique places (${tileCalls} tile calls)`);
    }
  }

  const allPlaces = Array.from(seenById.values());
  setCache(normalizedQuery, {
    places: allPlaces,
    maxPagesFetched: Math.max(cached?.maxPagesFetched || 0, maxPages),
    exhausted: fullyExhausted,
  });

  return allPlaces;
}

/**
 * Filter to businesses WITHOUT a website, deduplicate by place ID, and normalize.
 * Marks leads matching excludeIds with isSeen: true.
 * Adds direct action links: Google Maps URL, WhatsApp link, and Instagram lookup URL.
 */
function filterNoWebsite(places, options = {}) {
  const excludeSet = new Set(options.excludeIds || []);
  const seenKeys = new Set();
  const leads = [];

  for (const p of places) {
    if (p.websiteUri && p.websiteUri.trim()) continue;

    const key = placeKey(p);
    if (key && seenKeys.has(key)) continue;
    if (key) seenKeys.add(key);

    const name = p.displayName?.text || 'Unnamed Business';
    const address = p.formattedAddress || '';
    const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
    const whatsappUrl = formatWhatsAppLink(phone);
    const instagramSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${name} ${address} instagram`)}`;

    leads.push({
      id: p.id,
      name,
      address,
      phone,
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? 0,
      mapsUrl: p.googleMapsUri || '',
      whatsappUrl,
      instagramSearchUrl,
      email: '',
      isSeen: excludeSet.has(p.id),
    });
  }

  return leads;
}

module.exports = {
  searchBusinesses,
  filterNoWebsite,
  buildSearchQuery,
  formatWhatsAppLink,
  getPlacesStats,
  buildBoundingBox,
  splitIntoGrid,
  clearSearchCache,
};
