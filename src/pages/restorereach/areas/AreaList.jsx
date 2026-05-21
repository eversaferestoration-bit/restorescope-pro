import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Trash2, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#ef4444', bg: '#ef444420' },
  medium: { label: 'Medium', color: '#f59e0b', bg: '#f59e0b20' },
  low:    { label: 'Low',    color: '#10b981', bg: '#10b98120' },
};

const SEO_CONFIG = {
  active:  { label: 'SEO Active',  color: '#10b981', bg: '#10b98120' },
  pending: { label: 'SEO Pending', color: '#f59e0b', bg: '#f59e0b20' },
  none:    { label: 'No SEO',      color: '#3a5a7c', bg: '#1e2d45' },
};

export default function AreaList({ areas = [], isLoading, selectedId, onSelect }) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RRServiceArea.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-areas'] });
      toast({ title: 'Service area removed' });
    },
  });

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#1e2d45' }} />)}
    </div>
  );

  if (!areas.length) return (
    <div className="rounded-xl border py-10 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <MapPin size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
      <p className="text-sm text-white font-semibold">No service areas yet</p>
      <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Add your first city above</p>
    </div>
  );

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <h2 className="text-sm font-semibold text-white">Service Areas</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{areas.length}</span>
      </div>
      <div className="divide-y" style={{ borderColor: '#1e2d45' }}>
        {areas.map(area => {
          const pri = PRIORITY_CONFIG[area.priority_level] || PRIORITY_CONFIG.medium;
          const seo = SEO_CONFIG[area.seo_status] || SEO_CONFIG.none;
          const isSelected = selectedId === area.id;
          const pageCount = area.generated_pages?.length || 0;

          return (
            <div key={area.id}
              className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/3 transition"
              style={isSelected ? { background: '#e05a1c10', borderLeft: '3px solid #e05a1c' } : {}}
              onClick={() => onSelect(area)}>
              <MapPin size={14} style={{ color: pri.color }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-semibold text-white">{area.city}, {area.state}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: seo.bg, color: seo.color }}>{seo.label}</span>
                  {pageCount > 0 && (
                    <span className="text-xs" style={{ color: '#7ba3c8' }}>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
                {area.services_offered?.length > 0 && (
                  <p className="text-xs truncate" style={{ color: '#7ba3c8' }}>
                    {area.services_offered.slice(0, 3).join(', ')}{area.services_offered.length > 3 ? ` +${area.services_offered.length - 3}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => deleteMutation.mutate(area.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400 transition"
                  style={{ color: '#3a5a7c', background: '#0a1020' }}>
                  <Trash2 size={12} />
                </button>
                <ChevronRight size={14} style={{ color: isSelected ? '#e05a1c' : '#3a5a7c' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}