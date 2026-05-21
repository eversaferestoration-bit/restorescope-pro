import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CloudLightning, Zap } from 'lucide-react';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';

import StormEventForm from './storm/StormEventForm';
import StormEventCard from './storm/StormEventCard';

export default function RRStormMode() {
  const { user, companyId, profileLoading, isReady } = useRRCompany();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['storm-events', companyId],
    queryFn: () => base44.entities.StormEvent.filter({ company_id: companyId }, '-created_date', 50),
    enabled: !!companyId,
  });

  const active = events.filter(e => e.status === 'active');
  const monitoring = events.filter(e => e.status === 'monitoring');
  const triggered = events.filter(e => e.marketing_triggered);

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CloudLightning size={22} style={{ color: '#e05a1c' }} /> Storm Mode
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Log storm events, auto-generate emergency marketing content, and activate campaigns instantly
        </p>
      </div>

      {/* Active storm banner */}
      {active.length > 0 && (
        <div className="rounded-xl border px-5 py-4 flex items-center gap-3 animate-pulse"
          style={{ background: '#ef444415', borderColor: '#ef444450' }}>
          <Zap size={18} style={{ color: '#ef4444' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
              {active.length} Active Storm Event{active.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs" style={{ color: '#fca5a5' }}>
              {active.map(e => [e.affected_city, e.county].filter(Boolean).join(', ')).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: active.length, color: '#ef4444' },
          { label: 'Monitoring', value: monitoring.length, color: '#f59e0b' },
          { label: 'Campaigns Triggered', value: triggered.length, color: '#e05a1c' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <StormEventForm companyId={companyId} userEmail={user?.email} />

      {/* Events list */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CloudLightning size={14} style={{ color: '#e05a1c' }} /> Storm Events
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#1e2d45' }} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border py-12 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <CloudLightning size={32} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
            <p className="text-white font-semibold">No storm events logged</p>
            <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>Log a storm event above to auto-generate emergency marketing content</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <StormEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
    </RRAccessGate>
  );
}