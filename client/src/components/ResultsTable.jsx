import { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  CheckSquare,
  Square,
  Star,
  ChevronDown,
  Table2,
} from 'lucide-react';

export default function ResultsTable({ leads, total, filtered, onLeadsUpdate, onProceedToEmail }) {
  const [selected, setSelected] = useState(new Set());
  const [showDownload, setShowDownload] = useState(false);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = leads.length > 0 && selected.size === leads.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));

  const selectedLeads = useMemo(() => leads.filter((l) => selected.has(l.id)), [leads, selected]);

  const updateEmail = (id, email) => {
    onLeadsUpdate(leads.map((l) => (l.id === id ? { ...l, email } : l)));
  };

  // ── Exports ─────────────────────────────────────────────────────────
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = async () => {
    const data = selectedLeads.length ? selectedLeads : leads;
    const res = await fetch('/api/export/xlsx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: data }),
    });
    if (!res.ok) return alert('Export failed');
    downloadBlob(await res.blob(), 'leads.xlsx');
    setShowDownload(false);
  };

  const exportCsv = async () => {
    const data = selectedLeads.length ? selectedLeads : leads;
    const res = await fetch('/api/export/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: data }),
    });
    if (!res.ok) return alert('Export failed');
    downloadBlob(await res.blob(), 'leads.csv');
    setShowDownload(false);
  };

  const handleEmailClick = () => {
    const withEmail = selectedLeads.filter((l) => l.email.trim());
    if (!withEmail.length) return alert('Fill in the Email column for at least one selected lead.');
    onProceedToEmail(withEmail);
  };

  if (!leads.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Table2 /></div>
        <h3>No results yet</h3>
        <p>Run a search to find businesses without websites in your target area.</p>
      </div>
    );
  }

  return (
    <div className="sheet">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="sheet-toolbar">
        <div className="sheet-toolbar-left">
          <span className="sheet-info">
            <strong>{filtered}</strong> of {total} businesses have no website
          </span>
          {selected.size > 0 && (
            <>
              <div className="divider" />
              <span className="sheet-count">
                <CheckSquare size={12} />
                {selected.size} selected
              </span>
            </>
          )}
        </div>

        <div className="sheet-toolbar-right">
          {/* Download dropdown */}
          <div className="download-group">
            <button
              className="btn btn-outline"
              onClick={() => setShowDownload((s) => !s)}
              onBlur={() => setTimeout(() => setShowDownload(false), 150)}
            >
              <Download size={15} />
              Download
              <ChevronDown size={14} />
            </button>

            {showDownload && (
              <div className="download-menu">
                <button className="download-menu-item" onMouseDown={exportXlsx}>
                  <FileSpreadsheet />
                  <span>Excel Workbook</span>
                  <small>.xlsx</small>
                </button>
                <button className="download-menu-item" onMouseDown={exportCsv}>
                  <FileText />
                  <span>Contacts CSV</span>
                  <small>.csv</small>
                </button>
              </div>
            )}
          </div>

          <div className="divider" />

          <button
            className="btn btn-primary"
            onClick={handleEmailClick}
            disabled={selected.size === 0}
          >
            <Mail size={15} />
            Email Selected
          </button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="sheet-table-wrap">
        <table className="sheet-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th>Business Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Rating</th>
              <th>Reviews</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className={selected.has(lead.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                  />
                </td>
                <td className="cell-name">{lead.name}</td>
                <td>{lead.phone || '—'}</td>
                <td className="cell-address">{lead.address}</td>
                <td>
                  {lead.rating ? (
                    <span className="cell-rating">
                      <Star />
                      {lead.rating}
                    </span>
                  ) : '—'}
                </td>
                <td>{lead.reviews || '—'}</td>
                <td>
                  <input
                    type="email"
                    className="email-cell-input"
                    placeholder="Add email..."
                    value={lead.email}
                    onChange={(e) => updateEmail(lead.id, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="sheet-footer">
        <span>{leads.length} rows</span>
        <span>{selected.size ? `${selected.size} selected` : 'None selected'}</span>
      </div>
    </div>
  );
}
