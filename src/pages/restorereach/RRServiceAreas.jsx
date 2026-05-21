import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Map, Plus } from 'lucide-react';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';

import AddAreaForm from './areas/AddAreaForm';
import AreaCard from './areas/AreaCard';

const PRIORITY_FILTERS = ['all', 'high', 'medium', 'low'];

export default function RRServiceAreas() {
  const { companyId, profileLoading, isReady } = useRRCompany();
  const [showForm, setShowForm] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['rr-areas', companyId],
    queryFn: () => base44.entities.RRServiceArea.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  const filtered = priorityFilter === 'all' ? areas : areas.filter(a => a.priority_level === priorityFilter);
  const seoActive = areas.filter(a => a.seo_status === 'active').length;
  const totalPages = areas.reduce((sum, a) => sum + (a.seo_pages?.length || 0), 0);

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-4 md:p-7 max-w-5xl mx-auto space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Map size={22} style={{ color: '#e05a1c' }} /> Service Area SEO Manager
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
            Add cities, assign services, and auto-generate hyper-local SEO pages
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition shrink-0 min-h-[44px]"
          style={{ background: '#e05a1c' }}>
          {showForm ? '✕ Cancel' : <><Plus size={14} /> Add City</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          { label: 'Service Areas', value: areas.length, color: '#7ba3c8' },
          { label: 'SEO Active', value: seoActive, color: '#10b981' },
          { label: 'Pages Generated', value: totalPages, color: '#e05a1c' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-3 md:p-4 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-xl md:text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && <AddAreaForm companyId={companyId} onClose={() => setShowForm(false)} />}

      {/* Priority filter */}
      <div className="flex gap-1.5 flex-wrap">
        {PRIORITY_FILTERS.map(f => (
          <button key={f} onClick={() => setPriorityFilter(f)}
            className="text-xs px-3 py-2 rounded-lg border transition capitalize min-h-[36px]"
            style={priorityFilter === f
              ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
              : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
            {f === 'all' ? 'All Areas' : `${f} Priority`}
          </button>
        ))}
      </div>

      {/* Area cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: '#1e2d45' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border py-14 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <Map size={32} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
          <p className="text-white font-semibold">No service areas yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: '#7ba3c8' }}>Add a city to start generating local SEO content</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: '#e05a1c' }}>
            <Plus size={14} /> Add Your First City
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(area => <AreaCard key={area.id} area={area} />)}
        </div>
      )}
    </div>
    </RRAccessGate>
  );
}