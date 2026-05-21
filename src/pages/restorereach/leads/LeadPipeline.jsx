import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STATUSES = [
  { value: 'new',                 label: 'New',                 color: '#3b82f6', bg: '#3b82f620' },
  { value: 'contacted',           label: 'Contacted',           color: '#f59e0b', bg: '#f59e0b20' },
  { value: 'inspection_scheduled',label: 'Inspection Scheduled',color: '#8b5cf6', bg: '#8b5cf620' },
  { value: 'estimate_sent',       label: 'Estimate Sent',       color: '#06b6d4', bg: '#06b6d420' },
  { value: 'won',                 label: 'Won',                 color: '#10b981', bg: '#10b98120' },
  { value: 'lost',                label: 'Lost',                color: '#3a5a7c', bg: '#1e2d45'   },
];

const URGENCY_CONFIG = {
  emergency:  { label: 'Emergency', color: '#dc2626' },
  urgent:     { label: 'Urgent',    color: '#ef4444' },
  standard:   { label: 'Standard',  color: '#f59e0b' },
  quote_only: { label: 'Quote',     color: '#7ba3c8' },
};

function StatusSelect({ lead, onUpdate }) {
  const [open, setOpen] = useState(false);

  const current = STATUSES.find(s => s.value === lead.status) || STATUSES[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition"
        style={{ background: current.bg, color: current.color }}>
        {current.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 rounded-xl border shadow-xl overflow-hidden min-w-44"
          style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => { onUpdate(lead.id, s.value); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition flex items-center gap-2"
              style={{ color: s.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadPipeline({ leads = [], isLoading, filter, onFilterChange }) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RRLeadCapture.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-leads'] });
      toast({ title: 'Lead status updated' });
    },
  });

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      {/* Header + filter */}
      <div className="px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Lead Pipeline</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
            {filtered.length} leads
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => onFilterChange('all')}
            className="text-xs px-2.5 py-1 rounded-lg transition"
            style={filter === 'all' ? { background: '#e05a1c', color: '#fff' } : { background: '#1e2d45', color: '#7ba3c8' }}>
            All
          </button>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => onFilterChange(s.value)}
              className="text-xs px-2.5 py-1 rounded-lg transition"
              style={filter === s.value ? { background: s.bg, color: s.color, border: `1px solid ${s.color}60` } : { background: '#1e2d45', color: '#7ba3c8' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: '#3a5a7c' }}>No leads{filter !== 'all' ? ` with status "${filter}"` : ''} yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: '#1e2d45' }}>
          {filtered.map(lead => {
            const urg = URGENCY_CONFIG[lead.urgency_level] || URGENCY_CONFIG.standard;
            return (
              <div key={lead.id} className="px-5 py-4 hover:bg-white/3 transition">
                <div className="flex items-start gap-3">
                  {/* Urgency dot */}
                  <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: urg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-white">{lead.customer_name}</p>
                      <span className="text-xs font-medium" style={{ color: urg.color }}>{urg.label}</span>
                      {lead.service_needed && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                          {lead.service_needed}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs mb-2" style={{ color: '#7ba3c8' }}>
                      {lead.phone && <span className="flex items-center gap-1"><Phone size={10} />{lead.phone}</span>}
                      {lead.email && <span className="flex items-center gap-1 truncate max-w-[180px]"><Mail size={10} />{lead.email}</span>}
                      {lead.property_address && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin size={10} />{lead.property_address}</span>}
                    </div>

                    {lead.notes && (
                      <p className="text-xs line-clamp-2 mb-2" style={{ color: '#3a5a7c' }}>{lead.notes}</p>
                    )}

                    {lead.photos?.length > 0 && (
                      <div className="flex gap-1.5 mb-2">
                        {lead.photos.slice(0, 4).map((url, i) => (
                          <img key={i} src={url} alt="" className="w-10 h-10 object-cover rounded-lg border" style={{ borderColor: '#1e2d45' }} />
                        ))}
                        {lead.photos.length > 4 && <span className="text-xs self-center" style={{ color: '#7ba3c8' }}>+{lead.photos.length - 4}</span>}
                      </div>
                    )}
                  </div>

                  <StatusSelect lead={lead} onUpdate={(id, status) => updateMutation.mutate({ id, status })} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}