import { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Mail,
  ExternalLink,
  Clock,
  Info,
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

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

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
    <div className="templates-section">
      <div className="templates-header">
        <div>
          <h2>Outreach Copy & Pitch Angles</h2>
          <p className="templates-header-sub">
            Generated specifically for <strong>&ldquo;{query || 'Local Businesses'}&rdquo;</strong> who have no website.
          </p>
        </div>

        <button
          type="button"
          className="btn-refresh-template"
          onClick={fetchTemplate}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Generating...' : 'Regenerate'}</span>
        </button>
      </div>

      {error && (
        <div className="ui-alert ui-alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Quick Lead Selector ─────────────────────────────────────── */}
      {leads.length > 0 && (
        <div className="lead-preview-strip">
          <div className="strip-title">
            <Building size={14} />
            <span>Customize with a lead:</span>
          </div>
          <select
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
            className="strip-select"
          >
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} {l.phone ? `(${l.phone})` : ''}
              </option>
            ))}
          </select>

          {selectedLead?.whatsappUrl && (
            <a
              href={`${selectedLead.whatsappUrl}?text=${encodeURIComponent(renderPersonalized(template?.whatsappMessage))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-open-wa"
            >
              <span>Chat on WhatsApp</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* ── Template Cards Grid ─────────────────────────────────────── */}
      <div className="templates-cards-grid">
        {/* WhatsApp Pitch */}
        <div className="outreach-card card-wa-highlight">
          <div className="outreach-card-head">
            <div className="head-tag-wa">
              <MessageSquare size={14} />
              <span>WhatsApp / SMS Pitch</span>
            </div>
            <button
              type="button"
              className="btn-card-copy"
              onClick={() =>
                copyToClipboard(
                  selectedLead ? renderPersonalized(template?.whatsappMessage) : template?.whatsappMessage,
                  'wa'
                )
              }
            >
              {copiedKey === 'wa' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'wa' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="outreach-card-body">
            <p className="pitch-body-text">
              {selectedLead ? renderPersonalized(template?.whatsappMessage) : template?.whatsappMessage}
            </p>
          </div>
          <div className="outreach-card-footnote">
            Best channel for local Indian businesses. Send directly to the mobile number on Google Maps.
          </div>
        </div>

        {/* Cold Email Pitch */}
        <div className="outreach-card">
          <div className="outreach-card-head">
            <div className="head-tag-default">
              <Mail size={14} />
              <span>Cold Email Body</span>
            </div>
            <button
              type="button"
              className="btn-card-copy"
              onClick={() =>
                copyToClipboard(
                  selectedLead ? renderPersonalized(template?.emailBody) : template?.emailBody,
                  'email'
                )
              }
            >
              {copiedKey === 'email' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'email' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {template?.subjectLines && (
            <div className="subjects-row">
              <span className="subjects-caption">Subject options (click to copy):</span>
              <div className="subjects-buttons">
                {template.subjectLines.map((subj, idx) => {
                  const renderedSubj = selectedLead ? renderPersonalized(subj) : subj;
                  const isCopiedSubj = copiedKey === `subj_${idx}`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="btn-subject-chip"
                      onClick={() => copyToClipboard(renderedSubj, `subj_${idx}`)}
                    >
                      <span>{renderedSubj}</span>
                      {isCopiedSubj ? <Check size={11} className="text-emerald" /> : <Copy size={11} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="outreach-card-body pre-wrap-body">
            <p className="pitch-body-text">
              {selectedLead ? renderPersonalized(template?.emailBody) : template?.emailBody}
            </p>
          </div>
        </div>

        {/* Follow-Up */}
        <div className="outreach-card">
          <div className="outreach-card-head">
            <div className="head-tag-default">
              <Clock size={14} />
              <span>3-Day Follow-Up (Bump)</span>
            </div>
            <button
              type="button"
              className="btn-card-copy"
              onClick={() =>
                copyToClipboard(
                  selectedLead ? renderPersonalized(template?.followUpEmail) : template?.followUpEmail,
                  'followup'
                )
              }
            >
              {copiedKey === 'followup' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'followup' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="outreach-card-body pre-wrap-body">
            <p className="pitch-body-text">
              {selectedLead ? renderPersonalized(template?.followUpEmail) : template?.followUpEmail}
            </p>
          </div>
          <div className="outreach-card-footnote">
            Send 3 days later if the business didn&apos;t respond.
          </div>
        </div>

        {/* Talking Points */}
        <div className="outreach-card">
          <div className="outreach-card-head">
            <div className="head-tag-default">
              <Info size={14} />
              <span>Key Selling Points</span>
            </div>
          </div>

          <div className="talking-points-box">
            {template?.talkingPoints?.map((pt, i) => (
              <div key={i} className="tp-row">
                <span className="tp-num">{i + 1}</span>
                <span className="tp-desc">{pt}</span>
              </div>
            ))}
          </div>
          <div className="outreach-card-footnote">
            Use these points when calling or pitching on WhatsApp.
          </div>
        </div>
      </div>
    </div>
  );
}
