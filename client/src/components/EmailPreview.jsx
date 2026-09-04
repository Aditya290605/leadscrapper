import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

export default function EmailPreview({ leads, category, city, onBack }) {
  const [drafts, setDrafts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/email/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  // ── Generate ──────────────────────────────────────────────────────
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
      // Auto-expand first draft
      if (data.drafts.length) setExpanded(new Set([0]));
    } catch (err) {
      alert('Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = (index, field, value) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const toggleExpand = (i) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  // ── Send All ──────────────────────────────────────────────────────
  const handleSendAll = async () => {
    const ready = drafts.filter((d) => d.email && d.subject && d.body && d.status !== 'sent');
    if (!ready.length) return alert('No emails ready to send.');

    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: ready.map((d) => ({ to: d.email, subject: d.subject, bodyText: d.body })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDrafts((prev) =>
        prev.map((d) => {
          const result = data.results.find((r) => r.to === d.email);
          if (result) return { ...d, status: result.status, reason: result.reason || '' };
          return d;
        })
      );
      fetch('/api/email/stats').then((r) => r.json()).then(setStats).catch(() => {});
    } catch (err) {
      alert('Send failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // ── Badge ─────────────────────────────────────────────────────────
  const StatusBadge = ({ status, reason }) => {
    const config = {
      draft:   { icon: Edit3,        cls: 'badge-draft',   label: 'Draft' },
      pending: { icon: Clock,        cls: 'badge-pending', label: 'Pending' },
      sent:    { icon: CheckCircle2, cls: 'badge-sent',    label: 'Sent' },
      failed:  { icon: XCircle,      cls: 'badge-failed',  label: 'Failed' },
      skipped: { icon: AlertCircle,  cls: 'badge-skipped', label: 'Skipped' },
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return <span className={`badge ${c.cls}`} title={reason || ''}><Icon /> {c.label}</span>;
  };

  // ── Stats ─────────────────────────────────────────────────────────
  const sentCount = drafts.filter((d) => d.status === 'sent').length;
  const failedCount = drafts.filter((d) => d.status === 'failed').length;
  const draftCount = drafts.filter((d) => !d.status || d.status === 'draft').length;

  return (
    <div>
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="email-toolbar">
        <div className="email-toolbar-left">
          <button className="btn btn-ghost" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>

          {drafts.length > 0 && (
            <>
              <div className="divider" />
              <div className="email-stats">
                <span className="email-stat"><span className="dot dot-blue" />{draftCount} draft</span>
                <span className="email-stat"><span className="dot dot-green" />{sentCount} sent</span>
                {failedCount > 0 && (
                  <span className="email-stat"><span className="dot dot-red" />{failedCount} failed</span>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stats && (
            <div className="daily-stats">
              <BarChart3 />
              {stats.sent}/{stats.cap} today
            </div>
          )}

          {drafts.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSendAll}
              disabled={sending || drafts.every((d) => d.status === 'sent')}
            >
              {sending ? (
                <><span className="spinner spinner-white" /> Sending...</>
              ) : (
                <><Send size={15} /> Send All</>
              )}
            </button>
          )}
        </div>
      </div>

      {sending && (
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: '100%' }} />
        </div>
      )}

      {/* ── Generate card (no drafts yet) ────────────────────── */}
      {drafts.length === 0 && (
        <div className="generate-card">
          <Sparkles size={32} style={{ color: 'var(--green-500)', marginBottom: 12 }} />
          <p>
            {leads.length} lead{leads.length > 1 ? 's' : ''} ready for outreach.
            Generate AI-personalized emails for each?
          </p>
          <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <><span className="spinner spinner-white" /> Generating...</>
            ) : (
              <><Sparkles size={16} /> Generate Emails</>
            )}
          </button>
        </div>
      )}

      {/* ── Email list (Gmail-style) ─────────────────────────── */}
      {drafts.length > 0 && (
        <div className="email-list">
          {drafts.map((draft, i) => (
            <div className="email-row" key={draft.id || i}>
              {/* Row header (collapsed) */}
              <div className="email-row-header" onClick={() => toggleExpand(i)}>
                <div className="email-row-left">
                  <div className="email-avatar">
                    {(draft.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="email-row-info">
                    <div className="email-row-name">{draft.name}</div>
                    <div className="email-row-to">{draft.email}</div>
                  </div>
                  <div className="email-row-subject">{draft.subject || '(no subject)'}</div>
                </div>
                <div className="email-row-right">
                  <StatusBadge status={draft.status} reason={draft.reason} />
                  {expanded.has(i) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Compose area (expanded) */}
              {expanded.has(i) && (
                <div className="email-compose">
                  <div className="compose-field">
                    <label>To</label>
                    <input value={draft.email} readOnly />
                  </div>
                  <div className="compose-field">
                    <label>Subject</label>
                    <input
                      value={draft.subject}
                      onChange={(e) => updateDraft(i, 'subject', e.target.value)}
                      placeholder="Email subject..."
                      disabled={draft.status === 'sent'}
                    />
                  </div>
                  <div className="compose-body">
                    <textarea
                      value={draft.body}
                      onChange={(e) => updateDraft(i, 'body', e.target.value)}
                      disabled={draft.status === 'sent'}
                    />
                  </div>
                  {draft.reason && draft.status === 'failed' && (
                    <div className="error-msg" style={{ marginTop: 8 }}>
                      <AlertCircle />
                      {draft.reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
