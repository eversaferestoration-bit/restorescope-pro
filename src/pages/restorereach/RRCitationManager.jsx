import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import CitationCard from './citations/CitationCard';
import AddCitationForm from './citations/AddCitationForm';
import CitationScoreRing from './citations/CitationScoreRing';
import MasterNAPPanel from './citations/MasterNAPPanel';
import AICitationRecommendations from './citations/AICitationRecommendations';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, PlusCircle, Link2 } from 'lucide-react';

const TABS = [
  { key: 'all',          label: 'All',          icon: Link2 },
  { key: 'consistent',   label: 'Consistent',   icon: CheckCircle,   color: '#10b981' },
  { key: 'inconsistent', label: 'Inconsistent', icon: AlertTriangle, color: '#f59e0b' },
  { key: 'missing',      label: 'Missing',      icon: XCircle,       color: '#ef4444' },
  { key: 'unchecked',    label: 'Unchecked',    icon: HelpCircle,    color: '#3a5a7c' },
];

function computeCitationScore(citations) {
  if (!citations.length) return 0;
  const active = citations.filter(c => !c.is_deleted);
  if (!active.length) return 0;

  const consistent = active.filter(c => c.status === 'consistent').length;
  const inconsistent = active.filter(c => c.status === 'inconsistent').length;
  const missing = active.filter(c => c.status === 'missing').length;
  const unchecked = active.filter(c => c.status === 'unchecked').length;

  // Weights: consistent=100%, unchecked=50%, inconsistent=20%, missing=0%
  const weightedSum = (consistent * 100) + (unchecked * 50) + (inconsistent * 20) + (missing * 0);
  const maxPossible = active.length * 100;
  return Math.round((weightedSum / maxPossible) * 100);
}

export default function RRCitationManager() {
  const { companyId, profileLoading, isReady, profile } = useRRCompany();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [masterNAP, setMasterNAP] = useState({
    business_name: profile?.company_name || '',
    address: [profile?.city, profile?.state].filter(Boolean).join(', '),
    phone: profile?.phone || '',
    website: profile?.website || '',
  });

  const { data: allCitations = [], isLoading } = useQuery({
    queryKey: ['citations', companyId],
    queryFn: () => base44.entities.Citation.filter({ company_id: companyId, is_deleted: false }, '-created_date', 100),
    enabled: !!companyId,
  });

  const citationScore = useMemo(() => computeCitationScore(allCitations), [allCitations]);

  const counts = useMemo(() => ({
    all: allCitations.length,
    consistent:   allCitations.filter(c => c.status === 'consistent').length,
    inconsistent: allCitations.filter(c => c.status === 'inconsistent').length,
    missing:      allCitations.filter(c => c.status === 'missing').length,
    unchecked:    allCitations.filter(c => c.status === 'unchecked').length,
  }), [allCitations]);

  const filtered = activeTab === 'all' ? allCitations : allCitations.filter(c => c.status === activeTab);
  const completionPct = allCitations.length ? Math.round((counts.consistent / allCitations.length) * 100) : 0;

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Link2 size={22} style={{ color: '#e05a1c' }} /> Citation Manager
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
              Track NAP consistency across local directories and fix citation gaps
            </p>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
            style={{ background: '#e05a1c' }}>
            <PlusCircle size={14} /> Add Citation
          </button>
        </div>

        {/* Score + stats hero */}
        <div className="rounded-2xl border p-5 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <CitationScoreRing score={citationScore} size={120} />

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            {[
              { label: 'Consistent',   count: counts.consistent,   color: '#10b981', bg: '#10b98120' },
              { label: 'Inconsistent', count: counts.inconsistent, color: '#f59e0b', bg: '#f59e0b20' },
              { label: 'Missing',      count: counts.missing,      color: '#ef4444', bg: '#ef444420' },
              { label: 'Unchecked',    count: counts.unchecked,    color: '#3a5a7c', bg: '#1e2d4580' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-xs mt-0.5" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="sm:border-l sm:pl-6 sm:min-w-[120px] text-center" style={{ borderColor: '#1e2d45' }}>
            <p className="text-3xl font-bold text-white">{completionPct}%</p>
            <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>Completion</p>
            <div className="w-full h-1.5 rounded-full mt-2" style={{ background: '#1e2d45' }}>
              <div className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%`, background: '#10b981' }} />
            </div>
          </div>
        </div>

        {/* Master NAP */}
        <MasterNAPPanel masterNAP={masterNAP} onChange={setMasterNAP} />

        {/* Add form */}
        {showForm && (
          <AddCitationForm companyId={companyId} masterNAP={masterNAP} onClose={() => setShowForm(false)} />
        )}

        {/* Tabs */}
        {allCitations.length > 0 && (
          <div className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto no-scrollbar"
            style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const cnt = counts[t.key];
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0"
                  style={activeTab === t.key
                    ? { background: t.color || '#e05a1c', color: '#fff' }
                    : { color: '#7ba3c8' }}>
                  <Icon size={11} />
                  {t.label}
                  <span className="ml-0.5 opacity-70">({cnt})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#1e2d45' }} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allCitations.length === 0 && (
          <div className="rounded-2xl border py-16 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <Link2 size={36} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
            <p className="text-base font-bold text-white mb-1">No citations tracked yet</p>
            <p className="text-sm mb-5" style={{ color: '#7ba3c8' }}>
              Add your local directory listings to start monitoring NAP consistency
            </p>
            <button onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#e05a1c' }}>
              <PlusCircle size={14} className="inline mr-1.5" /> Add First Citation
            </button>
          </div>
        )}

        {/* Citation list */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(c => (
              <CitationCard key={c.id} citation={c} masterNAP={masterNAP} />
            ))}
          </div>
        )}

        {!isLoading && allCitations.length > 0 && filtered.length === 0 && (
          <div className="rounded-xl border py-10 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-sm text-white">No {activeTab} citations</p>
          </div>
        )}

        {/* AI Recommendations */}
        {allCitations.length > 0 && (
          <AICitationRecommendations
            citations={allCitations}
            masterNAP={masterNAP}
            citationScore={citationScore}
          />
        )}

      </div>
    </RRAccessGate>
  );
}