import { useState } from 'react';
import { Search, SlidersHorizontal, AlertCircle, ArrowRight } from 'lucide-react';

const POPULAR_QUERIES = [
  'turf in mumbai',
  'gym in thane',
  'dental clinic in andheri',
  'coaching classes in pune',
  'salons in bandra',
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
    <div className="search-section">
      <div className="search-banner">
        <h2>Find Local Businesses Without Websites</h2>
        <p className="search-banner-sub">
          Searches Google Maps, filters out any business that already has a website, and extracts phone numbers, ratings, and addresses ready for outreach.
        </p>
      </div>

      <div className="search-main-card">
        <form onSubmit={handleSearch} className="search-form-layout">
          <div className="search-bar-wrap">
            <Search className="search-bar-icon" size={18} />
            <input
              type="text"
              className="search-main-input"
              placeholder='Try "turf in mumbai", "gym in thane", "dentist in pune"...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="search-bar-actions">
            <div className="select-depth-box">
              <label htmlFor="maxPages">Volume:</label>
              <select
                id="maxPages"
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
                disabled={loading}
              >
                <option value="1">~20 results</option>
                <option value="3">~60 results</option>
                <option value="5">~100 results</option>
                <option value="10">~200 results</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-search-execute"
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  <span>Scanning Google Maps...</span>
                </>
              ) : (
                <>
                  <span>Search Businesses</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="ui-alert ui-alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="quick-suggestions-row">
          <span className="suggestions-title">Common Searches:</span>
          <div className="suggestions-chips">
            {POPULAR_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                className="chip-tag"
                onClick={() => handleChipClick(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
