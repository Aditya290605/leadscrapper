import { useState, useEffect, useRef } from 'react';
import { Search, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { getSeenIds } from '../utils/seenLeads';

const ANIMATED_PROMPTS = [
  'turf in mumbai',
  'gym in thane',
  'dental clinic in andheri',
  'coaching classes in pune',
  'salons in bandra',
  'sports club in bangalore',
  'physiotherapy clinic in delhi',
];

const POPULAR_QUERIES = [
  'turf in mumbai',
  'gym in thane',
  'dental clinic in andheri',
  'coaching classes in pune',
  'salons in bandra',
];

export default function SearchForm({ onResults, seenCount = 0, onResetSeen }) {
  const [query, setQuery] = useState('');
  const [maxPages, setMaxPages] = useState('3');
  const [hideSeen, setHideSeen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // ── Auto-typing dynamic placeholder animation ─────────────────────────
  const [animatedText, setAnimatedText] = useState('');
  const stateRef = useRef({
    promptIndex: 0,
    charIndex: 0,
    isDeleting: false,
  });

  useEffect(() => {
    // If the user is actively typing or input is focused with text, pause typing
    if (query) return;

    let timeout;
    const typeSpeed = 55;
    const deleteSpeed = 28;
    const holdPromptTime = 2000;
    const pauseBeforeNext = 300;

    const tick = () => {
      const { promptIndex, charIndex, isDeleting } = stateRef.current;
      const currentPrompt = ANIMATED_PROMPTS[promptIndex % ANIMATED_PROMPTS.length];

      if (!isDeleting) {
        // Typing forward
        if (charIndex < currentPrompt.length) {
          stateRef.current.charIndex += 1;
          setAnimatedText(currentPrompt.slice(0, stateRef.current.charIndex));
          timeout = setTimeout(tick, typeSpeed);
        } else {
          // Finished typing word, hold
          timeout = setTimeout(() => {
            stateRef.current.isDeleting = true;
            tick();
          }, holdPromptTime);
        }
      } else {
        // Deleting backward
        if (charIndex > 0) {
          stateRef.current.charIndex -= 1;
          setAnimatedText(currentPrompt.slice(0, stateRef.current.charIndex));
          timeout = setTimeout(tick, deleteSpeed);
        } else {
          // Finished deleting, move to next prompt
          stateRef.current.isDeleting = false;
          stateRef.current.promptIndex = (promptIndex + 1) % ANIMATED_PROMPTS.length;
          timeout = setTimeout(tick, pauseBeforeNext);
        }
      }
    };

    timeout = setTimeout(tick, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const searchQuery = (customQuery || query).trim();
    if (!searchQuery) return;

    setLoading(true);
    setError('');

    try {
      const excludeIds = getSeenIds();
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          maxPages: parseInt(maxPages, 10),
          excludeIds,
          hideSeen,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      onResults({
        leads: data.leads,
        skippedLeads: data.skippedLeads || [],
        total: data.total,
        filtered: data.filtered,
        duplicatesSkipped: data.duplicatesSkipped || 0,
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

  const placeholderDisplay = isFocused && !query
    ? 'Type a category and city (e.g. gym in thane)...'
    : `Try "${animatedText}"`;

  return (
    <div className="search-section">
      <div className="search-banner">
        <div className="soft-tag">
          <span className="soft-tag-dot" />
          <span>Google Maps Discovery</span>
        </div>
        <h2>Find Local Businesses Without Websites</h2>
        <p className="search-banner-sub">
          Scrapes businesses on Google Maps, automatically filters out any that already have a web domain, and delivers phone numbers and ratings ready for outreach.
        </p>
      </div>

      <div className="search-main-card">
        <form onSubmit={handleSearch} className="search-form-layout">
          <div className={`search-bar-wrap ${isFocused ? 'focused' : ''}`}>
            <Search className="search-bar-icon" size={18} />
            <input
              type="text"
              className="search-main-input"
              placeholder={placeholderDisplay}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={loading}
              autoFocus
            />
            {!query && !isFocused && (
              <span className="blinking-typing-cursor" aria-hidden="true" />
            )}
          </div>

          <div className="search-bar-actions">
            <div className="search-controls-left">
              <div className="select-depth-box">
                <label htmlFor="maxPages">Scan Volume:</label>
                <select
                  id="maxPages"
                  value={maxPages}
                  onChange={(e) => setMaxPages(e.target.value)}
                  disabled={loading}
                >
                  <option value="1">~20 leads</option>
                  <option value="3">~60 leads</option>
                  <option value="5">~100 leads</option>
                  <option value="10">~200 leads</option>
                </select>
              </div>

              <div className="dedup-toggle-box">
                <label className="dedup-checkbox-label">
                  <input
                    type="checkbox"
                    checked={hideSeen}
                    onChange={(e) => setHideSeen(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Skip seen</span>
                </label>
                {seenCount > 0 && (
                  <>
                    <span className="dedup-count-pill">({seenCount})</span>
                    {onResetSeen && (
                      <button
                        type="button"
                        className="btn-reset-seen"
                        onClick={onResetSeen}
                        disabled={loading}
                        title="Clear saved seen businesses history"
                      >
                        <RotateCcw size={11} />
                        <span>Reset</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-search-execute"
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  <span>{parseInt(maxPages, 10) > 3 ? 'Deep Scanning Area...' : 'Scanning Maps...'}</span>
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
          <span className="suggestions-title">Popular searches:</span>
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
