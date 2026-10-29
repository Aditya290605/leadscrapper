import { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Mail,
  ExternalLink,
  ChevronDown,
  Info,
  Clock,
  Send,
  Building,
  AlertCircle,
} from 'lucide-react';

export default function OutreachTemplates({ query, leads = [], onBack }) {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || '');
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchTemplate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/email/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || 'Local Business',
          category: query,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate template');
      setTemplate(data.template);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
  }, [query]);

  // Copy helper
  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Selected lead for live preview
  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const renderPersonalized = (rawText) => {
    if (!rawText || !selectedLead) return rawText || '';
    return rawText
      .replace(/\{\{business_name\}\}/gi, selectedLead.name || 'there')
      .replace(/\{\{city\}\}/gi, query || 'your area')
      .replace(/\{\{owner_name\}\}/gi, selectedLead.name || 'there')
      .replace(/\{\{sender_name\}\}/gi, template?.senderName || 'Aditya Magar')
      .replace(/\{\{sender_studio\}\}/gi, template?.studioName || 'Aditya Web Studio')
      .replace(/\{\{sender_phone\}\}/gi, template?.senderPhone || '+91 98765 43210');
  };

  return (
    <div className="template-container">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="template-header-bar">
        <div>
          <div className="badge-pill">Outreach Copy Generator</div>
          <h2>Customized Pitches for &ldquo;{query || 'Local Businesses'}&rdquo;</h2>
          <p className="template-subtitle">
            Tailored cold outreach copy designed for local businesses without websites. Copy directly or preview with your scraped leads.
          </p>
        </div>

        <button
          type="button"
          className="btn-outline-action"
          onClick={fetchTemplate}
          disabled={loading}
          title="Regenerate new AI angles for this search"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Generating...' : 'Regenerate Angles'}</span>
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {template?.isFallback && (
        <div className="alert-banner alert-info">
          <Info size={16} />
          <span>Serving verified high-converting template engine. Add your Gemini API key in server/.env for bespoke real-time variants.</span>
        </div>
      )}

      {/* ── Lead Quick-Personalizer Strip ──────────────────────────── */}
      {leads.length > 0 && (
        <div className="personalizer-bar">
          <div className="personalizer-label">
            <Building size={15} />
            <span>Personalize for Scraped Lead:</span>
          </div>
          <div className="personalizer-select-wrap">
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="lead-select"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.phone ? `(${l.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedLead?.whatsappUrl && (
            <a
              href={`${selectedLead.whatsappUrl}?text=${encodeURIComponent(renderPersonalized(template?.whatsappMessage))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-direct"
              title="Open WhatsApp chat with message pre-filled"
            >
              <span>Send WhatsApp Directly</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* ── Template Cards Grid ────────────────────────────────────── */}
      <div className="templates-grid">
        {/* Card 1: WhatsApp Outreach (Primary) */}
        <div className="template-card card-featured">
          <div className="card-top">
            <div className="card-type-badge badge-whatsapp">
              <MessageSquare size={13} />
              <span>WhatsApp / DM Pitch (Highest Response Rate)</span>
            </div>
            <button
              type="button"
              className="btn-copy"
              onClick={() =>
                copyToClipboard(
                  selectedLead ? renderPersonalized(template?.whatsappMessage) : template?.whatsappMessage,
                  'wa'
                )
              }
            >
              {copiedKey === 'wa' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'wa' ? 'Copied!' : 'Copy WhatsApp Pitch'}</span>
            </button>
          </div>

          <div className="card-content-box">
            <p className="template-text">
              {selectedLead ? renderPersonalized(template?.whatsappMessage) : template?.whatsappMessage}
            </p>
          </div>
          <div className="card-hint">
            Recommended: Send directly to the mobile phone number from Google Maps. 60–80% open rate.
          </div>
        </div>

        {/* Card 2: Cold Email Body */}
        <div className="template-card">
          <div className="card-top">
            <div className="card-type-badge">
              <Mail size={13} />
              <span>Cold Email Body</span>
            </div>
            <button
              type="button"
              className="btn-copy"
              onClick={() =>
                copyToClipboard(
                  selectedLead ? renderPersonalized(template?.emailBody) : template?.emailBody,
                  'email'
                )
              }
            >
              {copiedKey === 'email' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'email' ? 'Copied!' : 'Copy Email Body'}</span>
            </button>
          </div>

          {/* Subject Line Variations */}
          {template?.subjectLines && (
            <div className="subjects-section">
              <span className="section-mini-title">Subject Line Options (Click to copy):</span>
              <div className="subject-pills">
                {template.subjectLines.map((subj, idx) => {
                  const renderedSubj = selectedLead ? renderPersonalized(subj) : subj;
                  const isCopiedSubj = copiedKey === `subj_${idx}`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="subject-pill"
                      onClick={() => copyToClipboard(renderedSubj, `subj_${idx}`)}
                      title="Click to copy this subject line"
                    >
                      <span>{renderedSubj}</span>
                      {isCopiedSubj ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card-content-box pre-wrap-box">
            <p className="template-text">
              {selectedLead ? renderPersonalized(template?.emailBody) : template?.emailBody}
            </p>
          </div>
        </div>

        {/* Card 3: Follow-Up Bump */}
        <div className="template-card">
          <div className="card-top">
            <div className="card-type-badge">
              <Clock size={13} />
              <span>3-Day Follow-Up (Bump)</span>
            </div>
            <button
              type="button"
              className="btn-copy"
              onClick={() =>
                copyToClipboard(
                  selectedLead ? renderPersonalized(template?.followUpEmail) : template?.followUpEmail,
                  'followup'
                )
              }
            >
              {copiedKey === 'followup' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'followup' ? 'Copied!' : 'Copy Follow-up'}</span>
            </button>
          </div>

          <div className="card-content-box pre-wrap-box">
            <p className="template-text">
              {selectedLead ? renderPersonalized(template?.followUpEmail) : template?.followUpEmail}
            </p>
          </div>
          <div className="card-hint">
            Send 3 days after your initial message if you received no response.
          </div>
        </div>

        {/* Card 4: Sales Talking Points */}
        <div className="template-card">
          <div className="card-top">
            <div className="card-type-badge">
              <Info size={13} />
              <span>Niche Cheat Sheet & Pitch Angles</span>
            </div>
          </div>

          <div className="talking-points-list">
            {template?.talkingPoints?.map((pt, i) => (
              <div key={i} className="talking-point-item">
                <span className="point-bullet">0{i + 1}</span>
                <span className="point-text">{pt}</span>
              </div>
            ))}
          </div>
          <div className="card-hint">
            Use these arguments when talking to the business owner on phone calls or WhatsApp chats.
          </div>
        </div>
      </div>
    </div>
  );
}

