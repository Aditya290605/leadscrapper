import { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Star,
  ExternalLink,
  MessageSquare,
  Search,
  ArrowUpDown,
  Phone,
  Check,
  Copy,
  ChevronDown,
  Building2,
  Share2,
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

  // Toggle selection
  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = leads.length > 0 && selected.size === leads.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));

  // Update lead email inline
  const updateEmail = (id, email) => {
    onLeadsUpdate(leads.map((l) => (l.id === id ? { ...l, email } : l)));
  };

  // Filter & Sort logic
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Text search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.address.toLowerCase().includes(term) ||
          (l.phone && l.phone.includes(term))
      );
    }

    // Rating filter
    if (ratingFilter === '4.5') {
      result = result.filter((l) => l.rating !== null && l.rating >= 4.5);
    } else if (ratingFilter === '4.0') {
      result = result.filter((l) => l.rating !== null && l.rating >= 4.0);
    } else if (ratingFilter === 'under4') {
      result = result.filter((l) => l.rating !== null && l.rating < 4.0);
    } else if (ratingFilter === 'unrated') {
      result = result.filter((l) => l.rating === null || l.rating === undefined);
    }

    // Phone filter
    if (phoneFilter === 'has_phone') {
      result = result.filter((l) => l.phone && l.phone.trim().length > 0);
    } else if (phoneFilter === 'no_phone') {
      result = result.filter((l) => !l.phone || l.phone.trim().length === 0);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'rating_desc') {
        return (b.rating ?? -1) - (a.rating ?? -1);
      }
      if (sortBy === 'rating_asc') {
        return (a.rating ?? 99) - (b.rating ?? 99);
      }
      if (sortBy === 'reviews_desc') {
        return (b.reviews || 0) - (a.reviews || 0);
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [leads, searchTerm, ratingFilter, phoneFilter, sortBy]);

  // Exports
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

  // Quick copy outreach pitch for single lead
  const handleQuickCopyPitch = (lead) => {
    const pitch = `Hi ${lead.name || 'there'} team,\n\nCame across ${lead.name} on Google Maps in ${query || 'your city'}. Noticed you don't have a direct website or booking link linked on your profile.\n\nWe build custom websites with automated WhatsApp slot booking for local businesses. Open to a quick 2-minute preview of what we could build for you?\n\nBest,\nAditya Magar`;
    navigator.clipboard.writeText(pitch);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!leads.length) {
    return (
      <div className="empty-state-box">
        <Building2 size={36} className="empty-icon" />
        <h3>No leads found yet</h3>
        <p>Run a search above to scrape businesses without websites from Google Maps.</p>
      </div>
    );
  }

  return (
    <div className="sheet-container">
      {/* ── Sheet Action Header ────────────────────────────────────────── */}
      <div className="sheet-header-panel">
        <div className="sheet-header-left">
          <div className="query-meta-badge">
            <span className="dot-live" />
            <span>Search: &ldquo;{query}&rdquo;</span>
          </div>
          <span className="sheet-stats-label">
            <strong>{filtered}</strong> without website of {total} total scanned
          </span>
          {selected.size > 0 && (
            <span className="selection-counter-badge">
              {selected.size} selected
            </span>
          )}
        </div>

        <div className="sheet-header-right">
          {/* Export Dropdown */}
          <div className="dropdown-wrapper">
            <button
              type="button"
              className="btn-outline-action"
              onClick={() => setShowExportMenu((s) => !s)}
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={13} />
            </button>

            {showExportMenu && (
              <div className="export-menu-card">
                <button
                  type="button"
                  className="export-menu-row"
                  onClick={() => handleExport('xlsx')}
                >
                  <FileSpreadsheet size={15} />
                  <div className="export-row-text">
                    <span className="export-main">Excel Workbook</span>
                    <span className="export-sub">Styled .xlsx with maps links</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="export-menu-row"
                  onClick={() => handleExport('csv')}
                >
                  <FileText size={15} />
                  <div className="export-row-text">
                    <span className="export-main">Contacts CSV</span>
                    <span className="export-sub">Plain text .csv for mail merge</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-primary-action"
            onClick={() => onOpenTemplate({ leads, query })}
          >
            <MessageSquare size={14} />
            <span>Outreach Templates</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar ─────────────────────────────────── */}
      <div className="sheet-filter-bar">
        <div className="filter-search-box">
          <Search size={14} className="filter-icon" />
          <input
            type="text"
            placeholder="Filter by name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-dropdowns">
          <div className="filter-group">
            <label>Rating:</label>
            <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
              <option value="all">All Ratings</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4.0">4.0+ Stars</option>
              <option value="under4">Under 4.0</option>
              <option value="unrated">No Rating</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Phone:</label>
            <select value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="has_phone">Has Phone</option>
              <option value="no_phone">Missing Phone</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rating_desc">Rating (High to Low)</option>
              <option value="rating_asc">Rating (Low to High)</option>
              <option value="reviews_desc">Review Count</option>
              <option value="name_asc">Name (A to Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Data Table ────────────────────────────────────────────── */}
      <div className="table-responsive-box">
        <table className="leads-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                />
              </th>
              <th className="th-name">Business Name</th>
              <th className="th-contact">Contact & Outreach</th>
              <th className="th-rating">Rating</th>
              <th className="th-address">Location & Maps</th>
              <th className="th-email">Email (Optional)</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLeads.map((lead) => {
              const isSelected = selected.has(lead.id);
              const isCopied = copiedId === lead.id;

              return (
                <tr key={lead.id} className={isSelected ? 'row-selected' : ''}>
                  <td className="td-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(lead.id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </td>

                  <td className="td-name">
                    <div className="business-cell">
                      <span className="business-title">{lead.name}</span>
                      <span className="no-site-pill">No Website</span>
                    </div>
                  </td>

                  <td className="td-contact">
                    <div className="contact-links-stack">
                      {lead.phone ? (
                        <div className="phone-row">
                          <Phone size={12} className="text-zinc" />
                          <span className="phone-text">{lead.phone}</span>
                        </div>
                      ) : (
                        <span className="missing-text">No phone listed</span>
                      )}

                      <div className="channels-row">
                        {lead.whatsappUrl && (
                          <a
                            href={lead.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-channel btn-whatsapp"
                            title="Open direct WhatsApp chat"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink size={10} />
                          </a>
                        )}

                        <a
                          href={lead.instagramSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-channel btn-insta"
                          title="Search Instagram handle for this business"
                        >
                          <span>Instagram</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </td>

                  <td className="td-rating">
                    <div className="rating-pill-box">
                      {lead.rating !== null ? (
                        <>
                          <div className="star-rating">
                            <Star size={13} className="star-icon" fill="currentColor" />
                            <span>{Number(lead.rating).toFixed(1)}</span>
                          </div>
                          <span className="reviews-label">({lead.reviews || 0})</span>
                        </>
                      ) : (
                        <span className="missing-text">Unrated</span>
                      )}
                    </div>
                  </td>

                  <td className="td-address">
                    <div className="address-stack">
                      <span className="address-text" title={lead.address}>
                        {lead.address || 'Address not listed'}
                      </span>
                      {lead.mapsUrl && (
                        <a
                          href={lead.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="maps-link"
                        >
                          <span>Google Maps</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="td-email">
                    <input
                      type="email"
                      className="email-input-cell"
                      placeholder="Add email..."
                      value={lead.email || ''}
                      onChange={(e) => updateEmail(lead.id, e.target.value)}
                    />
                  </td>

                  <td className="td-actions">
                    <button
                      type="button"
                      className={`btn-quick-pitch ${isCopied ? 'btn-copied' : ''}`}
                      onClick={() => handleQuickCopyPitch(lead)}
                      title="Copy customized pitch for this business to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Pitch</span>
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

      {/* ── Table Footer ──────────────────────────────────────────────── */}
      <div className="sheet-footer-bar">
        <span>Showing {filteredAndSortedLeads.length} of {leads.length} leads</span>
        <span>{selected.size} selected for export</span>
      </div>
    </div>
  );
}
