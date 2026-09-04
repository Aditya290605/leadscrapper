import { useState } from 'react';

export default function SearchForm({ onResults }) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [maxPages, setMaxPages] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!category.trim() || !location.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category.trim(), location: location.trim(), maxPages: parseInt(maxPages) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      onResults({
        leads: data.leads,
        total: data.total,
        filtered: data.filtered,
        category: category.trim(),
        city: location.trim(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <form className="search-form" onSubmit={handleSearch}>
        <div className="form-group">
          <label htmlFor="category">Business Category</label>
          <input
            id="category"
            type="text"
            placeholder='e.g. "salons", "turf", "gyms"'
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">City / Location</label>
          <input
            id="location"
            type="text"
            placeholder='e.g. "Mumbai", "Pune"'
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <div className="form-group" style={{ maxWidth: 140 }}>
          <label htmlFor="maxPages">Max Results</label>
          <select id="maxPages" value={maxPages} onChange={(e) => setMaxPages(e.target.value)}>
            <option value="1">~20</option>
            <option value="3">~60</option>
            <option value="5">~100</option>
            <option value="7">~140</option>
            <option value="10">~200</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 42 }}>
          {loading ? <><span className="spinner" /> Searching…</> : '🔍 Search'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'var(--error)', fontSize: 13, marginTop: 12 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
