import { useState } from 'react';
import { Search, MapPin, SlidersHorizontal, AlertCircle, ArrowRight, CornerDownLeft } from 'lucide-react';

const POPULAR_QUERIES = [
  'turf in mumbai',
  'gym in thane',
  'dental clinic in andheri',
  'coaching classes in dadar',
  'salons in bandra',
  'sports club in pune',
];

export default function SearchForm({ onResults }) {
  const [query, setQuery] = useState('');
  const [maxPages, setMaxPages] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const searchQuery = (customQuery || query).trim();
    if (!searchQuery) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          maxPages: parseInt(maxPages, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      onResults({
        leads: data.leads,
        total: data.total,
        filtered: data.filtered,
        query: searchQuery,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (q) => {
    setQuery(q);
    handleSearch(null, q);
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <div className="badge-pill">Local Business Lead Discovery</div>
        <h1>Find businesses without websites</h1>
        <p className="search-subtitle">
          Scrapes Google Maps for local shops and services, filters out those who already have a website, and extracts phone numbers, ratings, and addresses.
        </p>
      </div>

      <div className="search-card">
        <form onSubmit={handleSearch} className="search-input-box">
          <div className="search-input-field">
            <Search className="field-icon" size={18} />
            <input
              type="text"
              placeholder='e.g. "turf in mumbai", "gym in thane", "dentist in pune"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="search-controls">
            <div className="pages-select-wrap">
              <SlidersHorizontal size={14} />
              <select
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
                disabled={loading}
                title="Max pages to scrape (20 leads per page)"
              >
                <option value="1">~20 results (1 page)</option>
                <option value="3">~60 results (3 pages)</option>
                <option value="5">~100 results (5 pages)</option>
                <option value="10">~200 results (10 pages)</option>
              </select>
            </div>

            <button type="submit" className="btn-search-submit" disabled={loading || !query.trim()}>
              {loading ? (
                <>
                  <span className="spinner-dots" />
                  <span>Searching Maps...</span>
                </>
              ) : (
                <>
                  <span>Find Leads</span>
                  <CornerDownLeft size={14} />
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="alert-banner alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="search-chips-row">
          <span className="chips-label">Quick search:</span>
          <div className="chips-list">
            {POPULAR_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                className="chip-btn"
                onClick={() => handleChipClick(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="search-features-grid">
        <div className="feature-item">
          <div className="feature-num">01</div>
          <div className="feature-title">Website Filter</div>
          <div className="feature-desc">Instantly discards businesses that already have a web domain so you only pitch high-probability clients.</div>
        </div>
        <div className="feature-item">
          <div className="feature-num">02</div>
          <div className="feature-title">Phone & WhatsApp Ready</div>
          <div className="feature-desc">Extracts verified contact numbers with 1-click WhatsApp chat links ready for immediate outreach.</div>
        </div>
        <div className="feature-item">
          <div className="feature-num">03</div>
          <div className="feature-title">Quota Protected</div>
          <div className="feature-desc">Automatic in-memory caching saves Google Places API costs by eliminating duplicate search charges.</div>
        </div>
      </div>
    </div>
  );
}
