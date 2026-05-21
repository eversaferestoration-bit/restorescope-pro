import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import CompetitorCard from './competitors/CompetitorCard';
import AddCompetitorForm from './competitors/AddCompetitorForm';
import CompetitorDashboardWidgets from './competitors/CompetitorDashboardWidgets';
import { VisibilityBarChart, ReviewsBarChart } from './competitors/CompetitorChart';
import AICompetitorRecommendations from './competitors/AICompetitorRecommendations';
import { Users, PlusCircle, SortAsc, BarChart2 } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'visibility_desc', label: 'Visibility ↓' },
  { value: 'visibility_asc', label: 'Visibility ↑' },
  { value: 'reviews_desc', label: 'Reviews ↓' },
  { value: 'rating_desc', label: 'Rating ↓' },
  { value: 'name_asc', label: 'Name A–Z' },
];

function sortCompetitors(list, sort) {
  const s = [...list];
  switch (sort) {
    case 'visibility_desc': return s.sort((a, b) => (b.visibility_score || 0) - (a.visibility_score || 0));
    case 'visibility_asc':  return s.sort((a, b) => (a.visibility_score || 0) - (b.visibility_score || 0));
    case 'reviews_desc':    return s.sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0));
    case 'rating_desc':     return s.sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0));
    case 'name_asc':        return s.sort((a, b) => a.competitor_name.localeCompare(b.competitor_name));
    default: return s;
  }
}

export default function RRCompetitorTracker() {
  const { companyId, profile, profileLoading, isReady } = useRRCompany();
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState('visibility_desc');
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'charts'

  const { data: allCompetitors = [], isLoading } = useQuery({
    queryKey: ['competitors', companyId],
    queryFn: () => base44.entities.Competitor.filter({ company_id: companyId, is_deleted: false }, '-created_date', 50),
    enabled: !!companyId,
  });

  // Use stored visibility score from profile or default 50
  const myScore = 50;
  const sorted = sortCompetitors(allCompetitors, sort);

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-4 md:p-7 max-w-6xl mx-auto space-y-5 md:space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={22} style={{ color: '#e05a1c' }} /> Competitor Tracker
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
              Monitor local restoration competitors and identify ranking opportunities
            </p>
          </div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition shrink-0 min-h-[44px]"
            style={{ background: '#e05a1c' }}
          >
            <PlusCircle size={14} /> Add Competitor
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <AddCompetitorForm companyId={companyId} onClose={() => setShowForm(false)} />
        )}

        {/* Dashboard widgets */}
        {allCompetitors.length > 0 && (
          <CompetitorDashboardWidgets competitors={allCompetitors} />
        )}

        {/* Tab switcher + sort */}
        {allCompetitors.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              {[
                { key: 'cards', label: 'Cards', icon: Users },
                { key: 'charts', label: 'Charts', icon: BarChart2 },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition min-h-[36px]"
                  style={activeTab === t.key
                    ? { background: '#e05a1c', color: '#fff' }
                    : { color: '#7ba3c8' }}>
                  <t.icon size={12} /> {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <SortAsc size={14} style={{ color: '#3a5a7c' }} />
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border focus:outline-none min-h-[36px]"
                style={{ background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: '#1e2d45' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allCompetitors.length === 0 && (
          <div className="rounded-2xl border py-16 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <Users size={36} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
            <p className="text-base font-bold text-white mb-1">No competitors tracked yet</p>
            <p className="text-sm mb-5" style={{ color: '#7ba3c8' }}>
              Add your local competitors to start tracking visibility gaps and opportunities
            </p>
            <button onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#e05a1c' }}>
              <PlusCircle size={14} className="inline mr-1.5" /> Add First Competitor
            </button>
          </div>
        )}

        {/* Cards view */}
        {!isLoading && activeTab === 'cards' && allCompetitors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(c => (
              <CompetitorCard key={c.id} competitor={c} myScore={myScore} />
            ))}
          </div>
        )}

        {/* Charts view */}
        {!isLoading && activeTab === 'charts' && allCompetitors.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <VisibilityBarChart competitors={sorted} myScore={myScore} myName={profile?.company_name || 'You'} />
            <ReviewsBarChart competitors={sorted} />
          </div>
        )}

        {/* AI Recommendations — always shown if competitors exist */}
        {allCompetitors.length > 0 && (
          <AICompetitorRecommendations
            competitors={allCompetitors}
            myScore={myScore}
            profile={profile}
          />
        )}

      </div>
    </RRAccessGate>
  );
}