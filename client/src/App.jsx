import { useState } from 'react';
import { Search, Table2, MessageSquare, Activity, MapPin, ChevronRight, ExternalLink } from 'lucide-react';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import OutreachTemplates from './components/OutreachTemplates';
import QuotaMonitor from './components/QuotaMonitor';

export default function App() {
  const [tab, setTab] = useState('search');
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ total: 0, filtered: 0, query: '' });

  const handleSearchResults = ({ leads, total, filtered, query }) => {
    setLeads(leads);
    setMeta({ total, filtered, query });
    setTab('results');
  };

  const handleOpenTemplate = ({ query }) => {
    setTab('templates');
  };

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
              disabled={leads.length === 0}
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
          {tab === 'search' && <SearchForm onResults={handleSearchResults} />}

          {tab === 'results' && (
            <ResultsTable
              leads={leads}
              total={meta.total}
              filtered={meta.filtered}
              query={meta.query}
              onLeadsUpdate={setLeads}
              onOpenTemplate={handleOpenTemplate}
            />
          )}

          {tab === 'templates' && (
            <OutreachTemplates
              query={meta.query || 'Local Businesses'}
              leads={leads}
              onBack={() => setTab('results')}
            />
          )}

          {tab === 'quota' && <QuotaMonitor />}
        </div>
      </main>
    </div>
  );
}
