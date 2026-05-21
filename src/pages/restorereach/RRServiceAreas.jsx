import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Map, Zap } from 'lucide-react';

import AddAreaForm from './areas/AddAreaForm';
import AreaList from './areas/AreaList';
import SEOPageGenerator from './areas/SEOPageGenerator';

export default function RRServiceAreas() {
  const { user } = useAuth();
  const companyId = user?.email || 'default';
  const [selectedArea, setSelectedArea] = useState(null);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list('-created_date', 100),
  });

  const seoActive = areas.filter(a => a.seo_status === 'active').length;
  const totalPages = areas.reduce((sum, a) => sum + (a.generated_pages?.length || 0), 0);

  const handleAreaAdded = (area) => setSelectedArea(area);

  return (
    <div className="p-5 md:p-7 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Map size={22} style={{ color: '#e05a1c' }} /> Service Area SEO Manager
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Manage service areas, assign services, and generate hyper-local SEO landing pages
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Service Areas', value: areas.length, color: '#7ba3c8' },
          { label: 'SEO Active',    value: seoActive,    color: '#10b981' },
          { label: 'Pages Created', value: totalPages,   color: '#e05a1c' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 2-col layout: left add form + area list, right generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-4">
          <AddAreaForm companyId={companyId} onAdded={handleAreaAdded} />
          <AreaList
            areas={areas}
            isLoading={isLoading}
            selectedId={selectedArea?.id}
            onSelect={(area) => setSelectedArea(prev => prev?.id === area.id ? null : area)}
          />
        </div>

        {/* Right: SEO Generator */}
        <div>
          {selectedArea ? (
            <SEOPageGenerator
              key={selectedArea.id}
              area={areas.find(a => a.id === selectedArea.id) || selectedArea}
            />
          ) : (
            <div className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
              style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
              <Zap size={32} className="mb-3" style={{ color: '#3a5a7c' }} />
              <p className="text-sm font-semibold text-white">Select a service area</p>
              <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Click a city to generate SEO pages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}