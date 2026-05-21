import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Pause, Eye, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SEVERITY_CONFIG = {
  low:          { label: 'Low',           color: '#10b981', bg: '#10b98120' },
  moderate:     { label: 'Moderate',      color: '#f59e0b', bg: '#f59e0b20' },
  high:         { label: 'High',          color: '#ef4444', bg: '#ef444420' },
  catastrophic: { label: 'Catastrophic',  color: '#dc2626', bg: '#dc262620' },
};

const STATUS_CONFIG = {
  monitoring: { label: 'Monitoring', color: '#7ba3c8', bg: '#1e2d45' },
  active:     { label: 'Active',     color: '#10b981', bg: '#10b98120' },
  paused:     { label: 'Paused',     color: '#3a5a7c', bg: '#1e2d45' },
};

const EVENT_ICONS = {
  flood: '🌊', hurricane: '🌀', tornado: '🌪️', hail: '🌨️',
  wind: '💨', ice_storm: '🧊', fire: '🔥', severe_thunderstorm: '⛈️', other: '⚠️',
};

export default function StormEventList({ events = [], isLoading, onActivate, onSelect, selectedId }) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StormEvent.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storm-events'] }),
  });

  const toggleStatus = (e, newStatus) => {
    updateMutation.mutate({ id: e.id, data: { status: newStatus } });
    toast({ title: `Storm status set to ${newStatus}` });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <h2 className="text-sm font-semibold text-white">Storm Events</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
          {events.length} events
        </span>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: '#3a5a7c' }}>No storm events logged yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: '#1e2d45' }}>
          {events.map(ev => {
            const sev = SEVERITY_CONFIG[ev.severity] || SEVERITY_CONFIG.moderate;
            const sta = STATUS_CONFIG[ev.status] || STATUS_CONFIG.monitoring;
            const icon = EVENT_ICONS[ev.event_type] || '⚠️';
            const isSelected = selectedId === ev.id;

            return (
              <div key={ev.id}
                className="px-5 py-4 hover:bg-white/3 transition cursor-pointer"
                style={isSelected ? { background: '#e05a1c10', borderLeft: '3px solid #e05a1c' } : {}}
                onClick={() => onSelect(ev)}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-white">
                        {ev.affected_city}{ev.county ? ` — ${ev.county}` : ''}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sta.bg, color: sta.color }}>{sta.label}</span>
                      {ev.marketing_triggered && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>
                          <CheckCircle2 size={9} className="inline mr-1" />Campaign Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs capitalize" style={{ color: '#7ba3c8' }}>
                      {ev.event_type?.replace(/_/g, ' ')} · {ev.event_date || 'No date'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {ev.status !== 'active' && (
                      <button onClick={() => toggleStatus(ev, 'active')} title="Set Active"
                        className="text-xs px-2 py-1.5 rounded-lg hover:text-green-400 transition"
                        style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                        <Eye size={12} />
                      </button>
                    )}
                    {ev.status === 'active' && (
                      <button onClick={() => toggleStatus(ev, 'paused')} title="Pause"
                        className="text-xs px-2 py-1.5 rounded-lg hover:text-yellow-400 transition"
                        style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                        <Pause size={12} />
                      </button>
                    )}
                    {!ev.marketing_triggered && (
                      <button onClick={() => onActivate(ev)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-white hover:opacity-90 transition"
                        style={{ background: '#e05a1c' }}>
                        <Zap size={10} /> Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}