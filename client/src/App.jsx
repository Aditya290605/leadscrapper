import { useState } from 'react';
import { Search, Table2, Mail, Zap } from 'lucide-react';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import EmailPreview from './components/EmailPreview';

const TABS = [
  { key: 'search', label: 'Search', icon: Search },
  { key: 'results', label: 'Results', icon: Table2 },
  { key: 'email', label: 'Outreach', icon: Mail },
];

export default function App() {
  const [tab, setTab] = useState('search');
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ total: 0, filtered: 0, category: '', city: '' });
  const [emailLeads, setEmailLeads] = useState([]);

  const handleSearchResults = ({ leads, total, filtered, category, city }) => {
    setLeads(leads);
    setMeta({ total, filtered, category, city });
    setTab('results');
  };

  const handleProceedToEmail = (selectedWithEmail) => {
    setEmailLeads(selectedWithEmail);
    setTab('email');
  };

  return (
    <div className="app">
      {/* ── Top Bar ──────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <Zap size={18} />
          </div>
          <div>
            <div className="topbar-title">LeadScrapper</div>
            <div className="topbar-subtitle">Find · Export · Outreach</div>
          </div>
        </div>

        <nav className="nav-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
              disabled={
                (key === 'results' && leads.length === 0) ||
                (key === 'email' && emailLeads.length === 0)
              }
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="main-content">
        {tab === 'search' && <SearchForm onResults={handleSearchResults} />}

        {tab === 'results' && (
          <ResultsTable
            leads={leads}
            total={meta.total}
            filtered={meta.filtered}
            onLeadsUpdate={setLeads}
            onProceedToEmail={handleProceedToEmail}
          />
        )}

        {tab === 'email' && (
          <EmailPreview
            leads={emailLeads}
            category={meta.category}
            city={meta.city}
            onBack={() => setTab('results')}
          />
        )}
      </main>
    </div>
  );
}
