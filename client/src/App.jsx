import { useState } from 'react';
import { Search, Table2, MessageSquare, Gauge, ArrowRight } from 'lucide-react';
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
    <div className="app-shell">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="app-navbar">
        <div className="nav-brand">
          <div className="brand-badge">LS</div>
          <div className="brand-text">
            <span className="brand-title">LeadScrapper</span>
            <span className="brand-version">v1.2</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            type="button"
            className={`nav-btn ${tab === 'search' ? 'nav-active' : ''}`}
            onClick={() => setTab('search')}
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          <button
            type="button"
            className={`nav-btn ${tab === 'results' ? 'nav-active' : ''}`}
            onClick={() => setTab('results')}
            disabled={leads.length === 0}
            title={leads.length === 0 ? 'Run a search first to view leads' : 'View scraped leads table'}
          >
            <Table2 size={14} />
            <span>Leads Table</span>
            {leads.length > 0 && <span className="tab-pill">{leads.length}</span>}
          </button>

          <button
            type="button"
            className={`nav-btn ${tab === 'templates' ? 'nav-active' : ''}`}
            onClick={() => setTab('templates')}
          >
            <MessageSquare size={14} />
            <span>Outreach Copy</span>
          </button>

          <button
            type="button"
            className={`nav-btn ${tab === 'quota' ? 'nav-active' : ''}`}
            onClick={() => setTab('quota')}
          >
            <Gauge size={14} />
            <span>API Quota</span>
          </button>
        </nav>
      </header>

      {/* ── Main View Router ─────────────────────────────────────────── */}
      <main className="app-viewport">
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
      </main>
    </div>
  );
}
