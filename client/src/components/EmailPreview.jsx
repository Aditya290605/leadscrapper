import { useState, useEffect } from 'react';

export default function EmailPreview({ leads, category, city, onBack }) {
  const [drafts, setDrafts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [stats, setStats] = useState(null);

  // Fetch send stats on mount
  useEffect(() => {
    fetch('/api/email/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  // ── Generate AI emails ────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, category, city }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDrafts(data.drafts);
    } catch (err) {
      alert('Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Update a draft's subject/body ─────────────────────────────────
  const updateDraft = (index, field, value) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  // ── Send all emails ──────────────────────────────────────────────
  const handleSendAll = async () => {
    const ready = drafts.filter((d) => d.email && d.subject && d.body && d.status !== 'sent');
    if (!ready.length) return alert('No emails ready to send.');

    setSending(true);
    setSendProgress(0);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: ready.map((d) => ({
            to: d.email,
            subject: d.subject,
            bodyText: d.body,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Map results back to drafts
      setDrafts((prev) =>
        prev.map((d) => {
          const result = data.results.find((r) => r.to === d.email);
          if (result) return { ...d, status: result.status, reason: result.reason || '' };
          return d;
        })
      );

      setSendProgress(100);

      // Refresh stats
      fetch('/api/email/stats').then((r) => r.json()).then(setStats).catch(() => {});
    } catch (err) {
      alert('Send failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // ── Status badge ──────────────────────────────────────────────────
  const Badge = ({ status, reason }) => {
    const cls = `badge badge-${status || 'draft'}`;
    return <span className={cls} title={reason || ''}>{status || 'draft'}</span>;
  };

  return (
    <div>
      {/* Back + stats bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back to Results</button>
        {stats && (
          <div className="send-stats">
            Today: <strong>{stats.sent}</strong> / {stats.cap} emails sent
          </div>
        )}
      </div>

      {/* Generate button if no drafts yet */}
      {drafts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            {leads.length} lead{leads.length > 1 ? 's' : ''} selected for outreach. Generate AI-personalized emails?
          </p>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? <><span className="spinner" /> Generating…</> : '✨ Generate Emails'}
          </button>
        </div>
      )}

      {/* Draft cards */}
      {drafts.length > 0 && (
        <>
          {/* Send all bar */}
          <div className="results-bar">
            <div className="stats">
              {drafts.filter((d) => d.status === 'sent').length} sent ·{' '}
              {drafts.filter((d) => d.status === 'failed').length} failed ·{' '}
              {drafts.filter((d) => !d.status || d.status === 'draft').length} pending
            </div>
            <button
              className="btn btn-success"
              onClick={handleSendAll}
              disabled={sending || drafts.every((d) => d.status === 'sent')}
            >
              {sending ? <><span className="spinner" /> Sending…</> : '📤 Send All'}
            </button>
          </div>

          {sending && (
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${sendProgress}%` }} />
            </div>
          )}

          <div className="email-drafts">
            {drafts.map((draft, i) => (
              <div className="email-card" key={draft.id || i}>
                <div className="email-card-header">
                  <div>
                    <h3>{draft.name}</h3>
                    <span className="to">To: {draft.email}</span>
                  </div>
                  <Badge status={draft.status} reason={draft.reason} />
                </div>

                <input
                  className="subject-input"
                  value={draft.subject}
                  onChange={(e) => updateDraft(i, 'subject', e.target.value)}
                  placeholder="Subject line…"
                  disabled={draft.status === 'sent'}
                />

                <textarea
                  value={draft.body}
                  onChange={(e) => updateDraft(i, 'body', e.target.value)}
                  disabled={draft.status === 'sent'}
                />

                {draft.reason && draft.status === 'failed' && (
                  <p style={{ color: 'var(--error)', fontSize: 12, marginTop: 8 }}>
                    ⚠ {draft.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
