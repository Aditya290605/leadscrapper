import { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Mail,
  Shield,
  ExternalLink,
  Layers,
  Database,
  Info,
} from 'lucide-react';

export default function QuotaMonitor() {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQuota = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/quota');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch quota metrics');
      setQuota(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  return (
    <div className="quota-container">
      <div className="quota-header">
        <div>
          <div className="badge-pill">System Telemetry</div>
          <h2>API Quota & Token Monitor</h2>
          <p className="quota-subtitle">
            Real-time tracking of API consumption, in-memory caching efficiency, and daily safety caps.
          </p>
        </div>

        <button
          type="button"
          className="btn-outline-action"
          onClick={fetchQuota}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {quota && (
        <div className="quota-cards-grid">
          {/* ── Places API Card ────────────────────────────────────────── */}
          <div className="quota-card">
            <div className="quota-card-header">
              <div className="quota-card-title">
                <Database size={16} className="text-zinc" />
                <span>Google Places API (New)</span>
              </div>
              <span className={`status-pill ${quota.places?.configured ? 'status-active' : 'status-pending'}`}>
                {quota.places?.configured ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>Configured</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} />
                    <span>Needs API Key</span>
                  </>
                )}
              </span>
            </div>

            <div className="quota-stats-grid">
              <div className="quota-stat-box">
                <span className="stat-label">Live API Requests</span>
                <span className="stat-value">{quota.places?.liveCalls || 0}</span>
              </div>
              <div className="quota-stat-box highlight-box">
                <span className="stat-label">Cache Hits (Free)</span>
                <span className="stat-value text-emerald">{quota.places?.cacheHits || 0}</span>
                <span className="stat-footnote">100% quota saved</span>
              </div>
              <div className="quota-stat-box">
                <span className="stat-label">Cached Queries</span>
                <span className="stat-value">{quota.places?.cachedQueries || 0}</span>
              </div>
            </div>

            <div className="quota-info-list">
              <div className="quota-info-item">
                <span className="info-key">Free Allowance:</span>
                <span className="info-val">$200.00 credit / month (~90-100 searches)</span>
              </div>
              <div className="quota-info-item">
                <span className="info-key">Endpoint Cost:</span>
                <span className="info-val">~$0.035 per Text Search page (20 places)</span>
              </div>
            </div>
          </div>

          {/* ── Gemini API Card ────────────────────────────────────────── */}
          <div className="quota-card">
            <div className="quota-card-header">
              <div className="quota-card-title">
                <Zap size={16} className="text-zinc" />
                <span>Google Gemini 2.0 Flash</span>
              </div>
              <span className={`status-pill ${quota.gemini?.configured ? 'status-active' : 'status-neutral'}`}>
                {quota.gemini?.configured ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <Info size={12} />
                    <span>Fallback Engine</span>
                  </>
                )}
              </span>
            </div>

            <div className="quota-stats-grid">
              <div className="quota-stat-box">
                <span className="stat-label">Generations in Session</span>
                <span className="stat-value">{quota.gemini?.totalCalls || 0}</span>
              </div>
              <div className="quota-stat-box">
                <span className="stat-label">Templates Created</span>
                <span className="stat-value">{quota.gemini?.templatesGenerated || 0}</span>
              </div>
              <div className="quota-stat-box">
                <span className="stat-label">Rate Limit</span>
                <span className="stat-value">15 RPM</span>
                <span className="stat-footnote">Free tier RPM</span>
              </div>
            </div>

            <div className="quota-info-list">
              <div className="quota-info-item">
                <span className="info-key">Daily Token Limit:</span>
                <span className="info-val">1,000,000 tokens / day (Free tier)</span>
              </div>
              <div className="quota-info-item">
                <span className="info-key">Optimization:</span>
                <span className="info-val">1 call per niche (saves 95% tokens)</span>
              </div>
            </div>
          </div>

          {/* ── Gmail SMTP Card ────────────────────────────────────────── */}
          <div className="quota-card">
            <div className="quota-card-header">
              <div className="quota-card-title">
                <Mail size={16} className="text-zinc" />
                <span>Gmail SMTP Sender</span>
              </div>
              <span className={`status-pill ${quota.email?.configured ? 'status-active' : 'status-pending'}`}>
                {quota.email?.configured ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} />
                    <span>Unconfigured</span>
                  </>
                )}
              </span>
            </div>

            <div className="quota-stats-grid">
              <div className="quota-stat-box">
                <span className="stat-label">Sent Today</span>
                <span className="stat-value">{quota.email?.sentToday || 0}</span>
                <span className="stat-footnote">of {quota.email?.dailyCap || 50} cap</span>
              </div>
              <div className="quota-stat-box">
                <span className="stat-label">Remaining Today</span>
                <span className="stat-value text-emerald">{quota.email?.remainingToday || 50}</span>
              </div>
              <div className="quota-stat-box">
                <span className="stat-label">Do-Not-Contact</span>
                <span className="stat-value">{quota.email?.dncCount || 0}</span>
                <span className="stat-footnote">blacklisted emails</span>
              </div>
            </div>

            <div className="quota-info-list">
              <div className="quota-info-item">
                <span className="info-key">Account:</span>
                <span className="info-val font-mono">{quota.email?.account || 'Not Set'}</span>
              </div>
              <div className="quota-info-item">
                <span className="info-key">Safety Delay:</span>
                <span className="info-val">{quota.email?.delayBetweenSends} between emails</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Keys Reference ─────────────────────────────────────── */}
      <div className="quota-guide-card">
        <h3>API Keys Setup Checklist</h3>
        <p className="guide-subtitle">
          All configuration lives in your local <code>server/.env</code> file. No keys are ever shared or transmitted externally.
        </p>

        <div className="guide-steps">
          <div className="guide-step">
            <span className="step-num">1</span>
            <div className="step-content">
              <strong>Google Places API Key</strong>
              <p>Enable &ldquo;Places API (New)&rdquo; in Google Cloud Console. Comes with $200 free credit monthly.</p>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-link"
              >
                <span>Google Cloud Credentials</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">2</span>
            <div className="step-content">
              <strong>Gemini API Key</strong>
              <p>Get a free API key with 15 RPM and 1 million free tokens/day from Google AI Studio.</p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-link"
              >
                <span>Google AI Studio</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="guide-step">
            <span className="step-num">3</span>
            <div className="step-content">
              <strong>Gmail App Password</strong>
              <p>Enable 2FA on your Google Account, then generate a 16-character App Password under Security.</p>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-link"
              >
                <span>Google App Passwords</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

