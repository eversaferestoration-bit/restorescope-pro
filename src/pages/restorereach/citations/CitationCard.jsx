import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import CitationStatusBadge, { STATUS_CONFIG } from './CitationStatusBadge';
import { Globe, Phone, MapPin, Building2, ExternalLink, ChevronDown, ChevronUp, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

function NAPRow({ icon: Icon, label, listed, master, color }) {
  const mismatch = master && listed && listed.toLowerCase().trim() !== master.toLowerCase().trim();
  return (
    <div className="flex items-start gap-2 py-1.5 text-xs border-b last:border-0" style={{ borderColor: '#1e2d4550' }}>
      <Icon size={11} className="shrink-0 mt-0.5" style={{ color: mismatch ? '#f59e0b' : '#3a5a7c' }} />
      <div className="flex-1 min-w-0">
        <span className="font-medium" style={{ color: '#7ba3c8' }}>{label}: </span>
        <span style={{ color: mismatch ? '#f59e0b' : '#c8d9eb' }}>{listed || '—'}</span>
        {mismatch && (
          <div className="flex items-center gap-1 mt-0.5" style={{ color: '#3a5a7c' }}>
            <AlertTriangle size={9} style={{ color: '#f59e0b' }} />
            <span>Master: {master}</span>
          </div>
        )}
      </div>
      {mismatch && (
        <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: '#f59e0b20', color: '#f59e0b' }}>Mismatch</span>
      )}
    </div>
  );
}

export default function CitationCard({ citation, masterNAP }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const updateMutation = useMutation({
    mutationFn: data => base44.entities.Citation.update(citation.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citations'], exact: false }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Citation.update(citation.id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citations'], exact: false });
      toast({ title: 'Citation removed' });
    },
  });

  const cfg = STATUS_CONFIG[citation.status] || STATUS_CONFIG.unchecked;
  const scoreColor = citation.consistency_score >= 80 ? '#10b981' : citation.consistency_score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-xl border overflow-hidden transition hover:border-slate-600"
      style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-3.5">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: '#1e2d45', color: cfg.color }}>
          {citation.directory_name[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{citation.directory_name}</p>
            <CitationStatusBadge status={citation.status} />
          </div>
          {citation.last_checked && (
            <p className="text-xs mt-0.5" style={{ color: '#3a5a7c' }}>
              Checked {format(new Date(citation.last_checked), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className="text-base font-bold" style={{ color: scoreColor }}>{citation.consistency_score ?? '—'}</p>
          <p className="text-xs" style={{ color: '#3a5a7c' }}>score</p>
        </div>

        {/* External link */}
        {citation.listing_url && (
          <a href={citation.listing_url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-white/10 transition shrink-0"
            style={{ color: '#3b82f6' }}>
            <ExternalLink size={13} />
          </a>
        )}

        <button onClick={() => setExpanded(s => !s)} className="p-1.5 rounded-lg hover:bg-white/10 transition shrink-0" style={{ color: '#3a5a7c' }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Expanded NAP detail */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-1" style={{ borderColor: '#1e2d45' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#3a5a7c' }}>NAP Details</p>
          <NAPRow icon={Building2} label="Name" listed={citation.business_name} master={masterNAP?.business_name} />
          <NAPRow icon={MapPin} label="Address" listed={citation.address} master={masterNAP?.address} />
          <NAPRow icon={Phone} label="Phone" listed={citation.phone} master={masterNAP?.phone} />
          <NAPRow icon={Globe} label="Website" listed={citation.website} master={masterNAP?.website} />

          {citation.notes && (
            <p className="text-xs pt-2" style={{ color: '#7ba3c8' }}>{citation.notes}</p>
          )}

          {/* Quick status update */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <p className="text-xs font-semibold" style={{ color: '#3a5a7c' }}>Update status:</p>
            {['consistent', 'inconsistent', 'missing'].map(s => {
              const c = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => updateMutation.mutate({ status: s, last_checked: new Date().toISOString().split('T')[0] })}
                  disabled={citation.status === s || updateMutation.isPending}
                  className="text-xs px-2.5 py-1 rounded-lg border transition disabled:opacity-40"
                  style={citation.status === s
                    ? { background: c.bg, borderColor: c.color, color: c.color }
                    : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                  {c.label}
                </button>
              );
            })}
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
              className="ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition"
              style={{ borderColor: '#ef444440', color: '#ef4444', background: '#ef444410' }}>
              <Trash2 size={10} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}