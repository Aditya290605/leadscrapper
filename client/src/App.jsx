import { useState } from 'react';
import { Search, Table2, MessageSquare, Activity, MapPin } from 'lucide-react';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import OutreachTemplates from './components/OutreachTemplates';
import QuotaMonitor from './components/QuotaMonitor';
import { getSeenIds, addSeenIds, clearSeenIds } from './utils/seenLeads';

export default function App() {
  const [tab, setTab] = useState('search');
  const [leads, setLeads] = useState([]);
  const [skippedLeads, setSkippedLeads] = useState([]);
  const [meta, setMeta] = useState({ total: 0, filtered: 0, duplicatesSkipped: 0, query: '' });
  const [seenCount, setSeenCount] = useState(() => getSeenIds().length);

  const handleSearchResults = ({ leads, skippedLeads = [], total, filtered, duplicatesSkipped = 0, query }) => {
    setLeads(leads);
    setSkippedLeads(skippedLeads);
    setMeta({ total, filtered, duplicatesSkipped, query });
    if (leads.length > 0) {
      setSeenCount(addSeenIds(leads.map((l) => l.id)));
    }
    setTab('results');
  };

  const handleResetSeen = () => {
    clearSeenIds();
    setSeenCount(0);
  };

  const handleOpenTemplate = ({ query }) => {
    setTab('templates');
  };

  const hasAnyResults = leads.length > 0 || skippedLeads.length > 0;

  return (
    <div className="layout-shell">
      {/* ── Left Sidebar Navigation ─────────────────────────────────── */}
      <aside className="layout-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-icon-box">
              <MapPin size={18} className="brand-pin-icon" />
            </div>
            <div className="brand-details">
              <span className="brand-name">LeadScrapper</span>
              <span className="brand-subtitle">Maps Lead Engine</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-group-label">WORKSPACE</div>

            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'search' ? 'active' : ''}`}
              onClick={() => setTab('search')}
            >
              <Search size={16} />
              <span>Find Leads</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'results' ? 'active' : ''}`}
              onClick={() => setTab('results')}
              disabled={!hasAnyResults}
            >
              <Table2 size={16} />
              <span>Leads Table</span>
              {leads.length > 0 && <span className="sidebar-count-pill">{leads.length}</span>}
            </button>

            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'templates' ? 'active' : ''}`}
              onClick={() => setTab('templates')}
            >
              <MessageSquare size={16} />
              <span>Outreach Copy</span>
            </button>

            <div className="nav-group-label" style={{ marginTop: '16px' }}>SYSTEM</div>

            <button
              type="button"
              className={`sidebar-nav-btn ${tab === 'quota' ? 'active' : ''}`}
              onClick={() => setTab('quota')}
            >
              <Activity size={16} />
              <span>API Quota</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="sidebar-footer">
          {meta.query && (
            <div className="sidebar-active-query">
              <span className="query-caption">Active Target</span>
              <span className="query-value" title={meta.query}>&ldquo;{meta.query}&rdquo;</span>
              <span className="query-stats">{leads.length} leads loaded</span>
            </div>
          )}
          <div className="sidebar-credit">
            <span>Client Acquisition Suite</span>
          </div>
        </div>
      </aside>

      {/* ── Main View Area ───────────────────────────────────────────── */}
      <main className="layout-content">
        <div className="content-inner">
          {tab === 'search' && (
            <SearchForm
              onResults={handleSearchResults}
              seenCount={seenCount}
              onResetSeen={handleResetSeen}
            />
          )}

          {tab === 'results' && (
            <ResultsTable
              leads={leads}
              skippedLeads={skippedLeads}
              total={meta.total}
              filtered={meta.filtered}
              duplicatesSkipped={meta.duplicatesSkipped}
              query={meta.query}
              onLeadsUpdate={setLeads}
              onSkippedLeadsUpdate={setSkippedLeads}
              onResetSeen={handleResetSeen}
              onOpenTemplate={handleOpenTemplate}
            />
          )}

          {tab === 'templates' && (
            <OutreachTemplates
              query={meta.query || 'Local Businesses'}
              leads={leads.length > 0 ? leads : skippedLeads}
              onBack={() => setTab('results')}
            />
          )}

          {tab === 'quota' && <QuotaMonitor />}
        </div>
      </main>
    </div>
  );
}
