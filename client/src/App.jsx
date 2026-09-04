import { useState } from 'react';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import EmailPreview from './components/EmailPreview';

const TABS = ['search', 'results', 'email'];
const TAB_LABELS = { search: '🔍 Search', results: '📋 Results', email: '✉️ Email' };

export default function App() {
  const [tab, setTab] = useState('search');
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ total: 0, filtered: 0, category: '', city: '' });
  const [emailLeads, setEmailLeads] = useState([]);

  // Search completed → switch to results
  const handleSearchResults = ({ leads, total, filtered, category, city }) => {
    setLeads(leads);
    setMeta({ total, filtered, category, city });
    setTab('results');
  };

  // User clicked "Email Selected" → switch to email tab
  const handleProceedToEmail = (selectedWithEmail) => {
    setEmailLeads(selectedWithEmail);
    setTab('email');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>LeadScrapper</h1>
        <p>Find businesses without websites · Export · Outreach</p>
      </header>

      {/* Navigation tabs */}
      <nav className="nav-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`nav-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            disabled={
              (t === 'results' && leads.length === 0) ||
              (t === 'email' && emailLeads.length === 0)
            }
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {/* Tab content */}
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
    </div>
  );
}
