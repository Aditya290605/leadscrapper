// Google Places API (New) — Text Search + field filtering
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

// Request these fields from Text Search so we skip separate Detail calls (cheaper)
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
].join(',');

/**
 * Search for businesses via Places Text Search (New).
 * Paginates automatically up to maxPages (20 results/page).
 * @param {string} category — e.g. "salons"
 * @param {string} location — e.g. "Mumbai"
 * @param {number} maxPages — max pagination depth (default 5 = ~100 results)
 * @returns {Array} raw place objects from the API
 */
async function searchBusinesses(category, location, maxPages = 5) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not set in .env');

  const results = [];
  let pageToken = null;

  for (let page = 0; page < maxPages; page++) {
    const body = { textQuery: `${category} in ${location}`, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;

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
      throw new Error(`Places API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    if (data.places) results.push(...data.places);

    pageToken = data.nextPageToken;
    if (!pageToken) break;

    // Google requires ~2s delay before nextPageToken is usable
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

/**
 * Filter to businesses WITHOUT a website and normalize into a clean shape.
 */
function filterNoWebsite(places) {
  return places
    .filter((p) => !p.websiteUri)
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? 0,
      email: '', // Not available from Places API — user fills manually
    }));
}

module.exports = { searchBusinesses, filterNoWebsite };
