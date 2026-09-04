import { useState, useMemo } from 'react';

export default function ResultsTable({ leads, total, filtered, onLeadsUpdate, onProceedToEmail }) {
  const [selected, setSelected] = useState(new Set());

  // Toggle a single row
  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Select / Deselect all
  const allSelected = leads.length > 0 && selected.size === leads.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  };

  // Currently selected leads
  const selectedLeads = useMemo(() => leads.filter((l) => selected.has(l.id)), [leads, selected]);

  // Update email for a lead
  const updateEmail = (id, email) => {
    onLeadsUpdate(leads.map((l) => (l.id === id ? { ...l, email } : l)));
  };

  // ── Export handlers ─────────────────────────────────────────────────
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
    const blob = await res.blob();
    downloadBlob(blob, 'leads.xlsx');
  };

  const exportCsv = async () => {
    const data = selectedLeads.length ? selectedLeads : leads;
    const res = await fetch('/api/export/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: data }),
    });
    if (!res.ok) return alert('Export failed');
    const blob = await res.blob();
    downloadBlob(blob, 'leads.csv');
  };

  // ── Proceed to email (only leads with an email filled in) ──────────
  const handleEmailClick = () => {
    const withEmail = selectedLeads.filter((l) => l.email.trim());
    if (!withEmail.length) {
      return alert('Fill in the Email column for at least one selected lead.');
    }
    onProceedToEmail(withEmail);
  };

  if (!leads.length) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>No results yet. Run a search to find businesses without websites.</p>
      </div>
    );
  }

  return (
    <>
      {/* Stats + action bar */}
      <div className="results-bar">
        <div className="stats">
          Found <strong>{total}</strong> businesses, <strong>{filtered}</strong> without a website
          {selected.size > 0 && <> · <strong>{selected.size}</strong> selected</>}
        </div>
        <div className="actions">
          <button className="btn btn-secondary btn-sm" onClick={exportXlsx}>📥 Export XLSX</button>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}>📄 Export CSV</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleEmailClick}
            disabled={selected.size === 0}
          >
            ✉️ Email Selected
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="leads-table-wrap">
        <table className="leads-table">
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
              <tr key={lead.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                  />
                </td>
                <td style={{ fontWeight: 500 }}>{lead.name}</td>
                <td>{lead.phone || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{lead.address}</td>
                <td><span className="rating">{lead.rating ? `⭐ ${lead.rating}` : '—'}</span></td>
                <td>{lead.reviews || '—'}</td>
                <td>
                  <input
                    type="email"
                    className="email-input"
                    placeholder="add email…"
                    value={lead.email}
                    onChange={(e) => updateEmail(lead.id, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
