// Persist seen Google Place IDs in browser localStorage so repeated/overlapping
// searches (even across Cloud Run restarts) don't keep surfacing the same leads.
const STORAGE_KEY = 'leadscrapper_seen_place_ids';
const MAX_SEEN_IDS = 5000;

export function getSeenIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id) : [];
  } catch {
    return [];
  }
}

export function addSeenIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return getSeenIds().length;
  const existing = getSeenIds();
  const seen = new Set(existing);
  for (const id of ids) {
    if (typeof id === 'string' && id) seen.add(id);
  }
  const trimmed = Array.from(seen).slice(-MAX_SEEN_IDS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
  return trimmed.length;
}

export function clearSeenIds() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  return 0;
}
