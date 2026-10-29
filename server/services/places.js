// Google Places API (New) — Text Search + field filtering
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

// Request these fields from Text Search including nextPageToken for pagination
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
  'nextPageToken',
].join(',');

// Simple in-memory cache to save API quota on repeated searches
// Format: key -> { data, expiresAt } (TTL: 1 hour)
const searchCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

const placesStats = { liveCalls: 0, cacheHits: 0 };

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
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
 * Search for businesses via Places Text Search (New).
 * Paginates automatically up to maxPages (20 results/page).
 * @param {string} textQuery — e.g. "turf in Mumbai" or "gym in Thane"
 * @param {number} maxPages — max pagination depth (default 5 = ~100 results)
 * @param {boolean} bypassCache — skip cache if true
 * @returns {Array} raw place objects from the API
 */
async function searchBusinesses(textQuery, maxPages = 5, bypassCache = false) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'your_places_api_key_here') {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured in server/.env. Please add your Google Cloud Places API key.');
  }

  const normalizedQuery = textQuery.trim().toLowerCase();
  const cacheKey = `${normalizedQuery}__p${maxPages}`;

  if (!bypassCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      placesStats.cacheHits++;
      console.log(`[places] Returning cached results for "${normalizedQuery}"`);
      return cached;
    }
  }

  const results = [];
  let pageToken = null;

  for (let page = 0; page < maxPages; page++) {
    const body = { textQuery, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;

    placesStats.liveCalls++;
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
    if (data.places && Array.isArray(data.places)) {
      results.push(...data.places);
    }

    pageToken = data.nextPageToken;
    if (!pageToken) {
      console.log(`[places] No more pages available. Total fetched: ${results.length}`);
      break;
    }

    // Small delay between page requests to allow token activation
    await new Promise((r) => setTimeout(r, 1000));
  }

  setCache(cacheKey, results);
  return results;
}

/**
 * Filter to businesses WITHOUT a website and normalize into a clean shape.
 * Adds direct action links: Google Maps URL, WhatsApp link, and Instagram lookup URL.
 */
function filterNoWebsite(places) {
  return places
    .filter((p) => !p.websiteUri || !p.websiteUri.trim())
    .map((p) => {
      const name = p.displayName?.text || 'Unnamed Business';
      const address = p.formattedAddress || '';
      const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
      const whatsappUrl = formatWhatsAppLink(phone);
      const instagramSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${name} ${address} instagram`)}`;

      return {
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
      };
    });
}

module.exports = {
  searchBusinesses,
  filterNoWebsite,
  buildSearchQuery,
  formatWhatsAppLink,
  getPlacesStats,
};
