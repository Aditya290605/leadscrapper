import { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Mail,
  ExternalLink,
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
    <div className="quota-section">
      <div className="quota-topbar">
        <div>
          <h2>API Quota & Token Monitor</h2>
          <p className="quota-topbar-sub">
            Real-time tracking of API consumption, in-memory cache savings, and daily email limits.
          </p>
        </div>

        <button
          type="button"
          className="btn-refresh-quota"
          onClick={fetchQuota}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="ui-alert ui-alert-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {quota && (
        <div className="quota-metric-cards">
          {/* Places API */}
          <div className="quota-box">
            <div className="quota-box-top">
              <div className="quota-box-title">
                <Database size={16} className="text-slate" />
                <span>Google Places API (New)</span>
              </div>
              <span className={`status-badge ${quota.places?.configured ? 'status-ok' : 'status-warn'}`}>
                {quota.places?.configured ? 'Active' : 'Missing Key'}
              </span>
            </div>

            <div className="quota-numbers-row">
              <div className="number-unit">
                <span className="unit-label">Live Calls</span>
                <span className="unit-val">{quota.places?.liveCalls || 0}</span>
              </div>
              <div className="number-unit highlight-unit">
                <span className="unit-label">Cache Hits</span>
                <span className="unit-val text-emerald">{quota.places?.cacheHits || 0}</span>
                <span className="unit-note">100% saved</span>
              </div>
              <div className="number-unit">
                <span className="unit-label">Cached Queries</span>
                <span className="unit-val">{quota.places?.cachedQueries || 0}</span>
              </div>
            </div>

            <div className="quota-details-list">
              <div className="detail-item">
                <span>Free Monthly Allowance:</span>
                <strong>$200 credit / mo (~90-100 searches)</strong>
              </div>
              <div className="detail-item">
                <span>Request Cost:</span>
                <strong>~$0.035 / Text Search page</strong>
              </div>
            </div>
          </div>

          {/* Gemini API */}
          <div className="quota-box">
            <div className="quota-box-top">
              <div className="quota-box-title">
                <Zap size={16} className="text-slate" />
                <span>Google {quota.gemini?.model ? quota.gemini.model.replace(/^models\//, '') : 'Gemini 3.5 Flash'}</span>
              </div>
              <span className={`status-badge ${quota.gemini?.configured ? 'status-ok' : 'status-neutral'}`}>
                {quota.gemini?.configured ? 'Active' : 'Fallback Engine'}
              </span>
            </div>

            <div className="quota-numbers-row">
              <div className="number-unit">
                <span className="unit-label">AI Calls</span>
                <span className="unit-val">{quota.gemini?.totalCalls || 0}</span>
              </div>
              <div className="number-unit">
                <span className="unit-label">Templates</span>
                <span className="unit-val">{quota.gemini?.templatesGenerated || 0}</span>
              </div>
              <div className="number-unit">
                <span className="unit-label">Rate Limit</span>
                <span className="unit-val">15 RPM</span>
                <span className="unit-note">Free tier</span>
              </div>
            </div>

            <div className="quota-details-list">
              <div className="detail-item">
                <span>Free Daily Allowance:</span>
                <strong>1,000,000 tokens / day</strong>
              </div>
              <div className="detail-item">
                <span>Efficiency:</span>
                <strong>1 prompt per niche (saves 95% tokens)</strong>
              </div>
            </div>
          </div>

          {/* Gmail SMTP */}
          <div className="quota-box">
            <div className="quota-box-top">
              <div className="quota-box-title">
                <Mail size={16} className="text-slate" />
                <span>Gmail SMTP Sender</span>
              </div>
              <span className={`status-badge ${quota.email?.configured ? 'status-ok' : 'status-warn'}`}>
                {quota.email?.configured ? 'Connected' : 'Unconfigured'}
              </span>
            </div>

            <div className="quota-numbers-row">
              <div className="number-unit">
                <span className="unit-label">Sent Today</span>
                <span className="unit-val">{quota.email?.sentToday || 0}</span>
                <span className="unit-note">of {quota.email?.dailyCap || 50} cap</span>
              </div>
              <div className="number-unit">
                <span className="unit-label">Remaining Today</span>
                <span className="unit-val text-emerald">{quota.email?.remainingToday || 50}</span>
              </div>
              <div className="number-unit">
                <span className="unit-label">Blacklisted</span>
                <span className="unit-val">{quota.email?.dncCount || 0}</span>
              </div>
            </div>

            <div className="quota-details-list">
              <div className="detail-item">
                <span>Sender Account:</span>
                <strong className="font-mono">{quota.email?.account || 'Not Set'}</strong>
              </div>
              <div className="detail-item">
                <span>Safety Delay:</span>
                <strong>{quota.email?.delayBetweenSends} between emails</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide Card */}
      <div className="keys-guide-box">
        <h3>Where to get your API keys</h3>
        <p className="keys-guide-sub">
          Keys are stored safely in your local <code>server/.env</code> file.
        </p>

        <div className="keys-guide-grid">
          <div className="guide-card">
            <span className="guide-step-badge">1</span>
            <div>
              <strong>Google Places API (New)</strong>
              <p>Enable &ldquo;Places API (New)&rdquo; on Google Cloud Console ($200 free credit monthly).</p>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-anchor"
              >
                <span>Google Cloud Credentials</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          <div className="guide-card">
            <span className="guide-step-badge">2</span>
            <div>
              <strong>Google Gemini API</strong>
              <p>Free 15 RPM / 1M token key from Google AI Studio.</p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-anchor"
              >
                <span>Google AI Studio</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          <div className="guide-card">
            <span className="guide-step-badge">3</span>
            <div>
              <strong>Gmail App Password</strong>
              <p>16-char App Password from your Google Account security settings.</p>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-anchor"
              >
                <span>Google App Passwords</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
