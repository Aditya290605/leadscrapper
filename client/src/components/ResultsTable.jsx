import { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Star,
  ExternalLink,
  MessageSquare,
  Search,
  Check,
  Copy,
  ChevronDown,
  Building2,
  Phone,
} from 'lucide-react';

export default function ResultsTable({
  leads,
  total,
  filtered,
  query,
  onLeadsUpdate,
  onOpenTemplate,
}) {
  const [selected, setSelected] = useState(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [phoneFilter, setPhoneFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [copiedId, setCopiedId] = useState(null);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = leads.length > 0 && selected.size === leads.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));

  const updateEmail = (id, email) => {
    onLeadsUpdate(leads.map((l) => (l.id === id ? { ...l, email } : l)));
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.address.toLowerCase().includes(term) ||
          (l.phone && l.phone.includes(term))
      );
    }

    if (ratingFilter === '4.5') {
      result = result.filter((l) => l.rating !== null && l.rating >= 4.5);
    } else if (ratingFilter === '4.0') {
      result = result.filter((l) => l.rating !== null && l.rating >= 4.0);
    } else if (ratingFilter === 'under4') {
      result = result.filter((l) => l.rating !== null && l.rating < 4.0);
    } else if (ratingFilter === 'unrated') {
      result = result.filter((l) => l.rating === null || l.rating === undefined);
    }

    if (phoneFilter === 'has_phone') {
      result = result.filter((l) => l.phone && l.phone.trim().length > 0);
    } else if (phoneFilter === 'no_phone') {
      result = result.filter((l) => !l.phone || l.phone.trim().length === 0);
    }

    result.sort((a, b) => {
      if (sortBy === 'rating_desc') return (b.rating ?? -1) - (a.rating ?? -1);
      if (sortBy === 'rating_asc') return (a.rating ?? 99) - (b.rating ?? 99);
      if (sortBy === 'reviews_desc') return (b.reviews || 0) - (a.reviews || 0);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [leads, searchTerm, ratingFilter, phoneFilter, sortBy]);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    const targetLeads = selected.size > 0 ? leads.filter((l) => selected.has(l.id)) : leads;
    const endpoint = type === 'xlsx' ? '/api/export/xlsx' : '/api/export/csv';
    const filename = `leads_${query ? query.replace(/\s+/g, '_') : 'export'}.${type}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: targetLeads }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      downloadBlob(blob, filename);
      setShowExportMenu(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQuickCopyPitch = (lead) => {
    const pitch = `Hi ${lead.name || 'there'} team,\n\nCame across ${lead.name} on Google Maps in ${query || 'your city'}. Noticed you don't have a direct website or booking link linked on your profile.\n\nWe build custom websites with automated WhatsApp slot booking for local businesses. Open to a quick 2-minute preview of what we could build for you?\n\nBest,\nAditya Magar`;
    navigator.clipboard.writeText(pitch);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!leads.length) {
    return (
      <div className="empty-panel">
        <Building2 size={36} className="empty-panel-icon" />
        <h3>No leads loaded</h3>
        <p>Run a search from the left navigation to find businesses without websites.</p>
      </div>
    );
  }

  return (
    <div className="sheet-view">
      {/* ── Top Summary Header ────────────────────────────────────────── */}
      <div className="sheet-summary-bar">
        <div>
          <h2 className="sheet-title">Scraped Businesses</h2>
          <p className="sheet-meta-desc">
            Found <strong>{filtered}</strong> businesses without a website out of <strong>{total}</strong> scanned for &ldquo;{query}&rdquo;.
          </p>
        </div>

        <div className="sheet-top-actions">
          <div className="dropdown-container">
            <button
              type="button"
              className="btn-sheet-secondary"
              onClick={() => setShowExportMenu((s) => !s)}
            >
              <Download size={14} />
              <span>Export {selected.size > 0 ? `(${selected.size})` : ''}</span>
              <ChevronDown size={12} />
            </button>

            {showExportMenu && (
              <div className="dropdown-flyout">
                <button
                  type="button"
                  className="dropdown-row"
                  onClick={() => handleExport('xlsx')}
                >
                  <FileSpreadsheet size={15} className="text-emerald" />
                  <div>
                    <span className="dropdown-row-title">Excel (.xlsx)</span>
                    <span className="dropdown-row-sub">Styled spreadsheet with links</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="dropdown-row"
                  onClick={() => handleExport('csv')}
                >
                  <FileText size={15} />
                  <div>
                    <span className="dropdown-row-title">CSV (.csv)</span>
                    <span className="dropdown-row-sub">Raw data for mail merge</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-sheet-primary"
            onClick={() => onOpenTemplate({ leads, query })}
          >
            <MessageSquare size={14} />
            <span>Outreach Copy</span>
          </button>
        </div>
      </div>

      {/* ── Filter Controls Bar ───────────────────────────────────────── */}
      <div className="sheet-controls-bar">
        <div className="search-filter-input-wrap">
          <Search size={14} className="filter-search-icon" />
          <input
            type="text"
            placeholder="Search business name, phone, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="controls-filters-group">
          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
            <option value="all">All Ratings</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.0">4.0+ Stars</option>
            <option value="under4">Under 4.0</option>
            <option value="unrated">Unrated</option>
          </select>

          <select value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)}>
            <option value="all">All Contacts</option>
            <option value="has_phone">With Phone Only</option>
            <option value="no_phone">Missing Phone</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="rating_desc">Highest Rated</option>
            <option value="rating_asc">Lowest Rated</option>
            <option value="reviews_desc">Most Reviews</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="sheet-table-card">
        <table className="clean-table">
          <thead>
            <tr>
              <th className="th-select">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th>Business</th>
              <th>Contact Number</th>
              <th>Rating</th>
              <th>Address</th>
              <th>Email (Optional)</th>
              <th className="th-action">Quick Pitch</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLeads.map((lead) => {
              const isSelected = selected.has(lead.id);
              const isCopied = copiedId === lead.id;

              return (
                <tr key={lead.id} className={isSelected ? 'selected-row' : ''}>
                  <td className="td-select">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(lead.id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </td>

                  <td>
                    <div className="lead-name-cell">
                      <span className="lead-name-text">{lead.name}</span>
                      <span className="badge-no-web">No Website</span>
                    </div>
                  </td>

                  <td>
                    {lead.phone ? (
                      <div className="phone-cell">
                        <span className="phone-val">{lead.phone}</span>
                        {lead.whatsappUrl && (
                          <a
                            href={`${lead.whatsappUrl}?text=${encodeURIComponent(`Hi ${lead.name} team, came across your business on Google Maps!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-wa-link"
                            title="Open WhatsApp chat"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </td>

                  <td>
                    {lead.rating !== null ? (
                      <div className="rating-cell">
                        <Star size={13} className="star-filled" />
                        <span className="rating-val">{Number(lead.rating).toFixed(1)}</span>
                        <span className="reviews-val">({lead.reviews || 0})</span>
                      </div>
                    ) : (
                      <span className="cell-muted">Unrated</span>
                    )}
                  </td>

                  <td>
                    <div className="address-cell">
                      <span className="address-str" title={lead.address}>
                        {lead.address || '—'}
                      </span>
                      {lead.mapsUrl && (
                        <a
                          href={lead.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="maps-open-link"
                        >
                          <span>Google Maps</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td>
                    <input
                      type="email"
                      className="email-inline-field"
                      placeholder="Add email..."
                      value={lead.email || ''}
                      onChange={(e) => updateEmail(lead.id, e.target.value)}
                    />
                  </td>

                  <td className="td-action">
                    <button
                      type="button"
                      className={`btn-copy-pitch ${isCopied ? 'btn-copy-success' : ''}`}
                      onClick={() => handleQuickCopyPitch(lead)}
                      title="Copy customized pitch for this business"
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Pitch</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sheet-bottom-summary">
        <span>Showing {filteredAndSortedLeads.length} of {leads.length} businesses</span>
        {selected.size > 0 && <span><strong>{selected.size}</strong> selected for export</span>}
      </div>
    </div>
  );
}
