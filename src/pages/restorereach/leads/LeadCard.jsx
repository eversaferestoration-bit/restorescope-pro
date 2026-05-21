import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Mail, MapPin, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STATUS_OPTIONS = [
  { value: 'new',                  label: 'New',                  color: '#3b82f6', bg: '#3b82f620' },
  { value: 'contacted',            label: 'Contacted',            color: '#f59e0b', bg: '#f59e0b20' },
  { value: 'inspection_scheduled', label: 'Inspection Scheduled', color: '#8b5cf6', bg: '#8b5cf620' },
  { value: 'estimate_sent',        label: 'Estimate Sent',        color: '#06b6d4', bg: '#06b6d420' },
  { value: 'won',                  label: 'Won',                  color: '#10b981', bg: '#10b98120' },
  { value: 'lost',                 label: 'Lost',                 color: '#ef4444', bg: '#ef444420' },
];

const URGENCY_CONFIG = {
  low:      { label: 'Low',      color: '#10b981', bg: '#10b98120' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: '#f59e0b20' },
  high:     { label: 'High',     color: '#ef4444', bg: '#ef444420' },
  critical: { label: 'CRITICAL', color: '#dc2626', bg: '#dc262620' },
};

export default function LeadCard({ lead }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const status = STATUS_OPTIONS.find(s => s.value === lead.status) || STATUS_OPTIONS[0];
  const urgency = URGENCY_CONFIG[lead.urgency_level] || URGENCY_CONFIG.medium;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.EmergencyLead.update(lead.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency-leads'] }),
  });

  const updateStatus = (value) => {
    updateMutation.mutate({ status: value });
    toast({ title: `Status updated to ${STATUS_OPTIONS.find(s => s.value === value)?.label}` });
  };

  const address = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ');

  return (
    <div className="rounded-xl border overflow-hidden transition"
      style={{ background: '#0d1829', borderColor: lead.urgency_level === 'critical' ? '#dc262660' : '#1e2d45' }}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Urgency score circle */}
        <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
          style={{ background: urgency.bg }}>
          <span className="text-sm font-bold leading-none" style={{ color: urgency.color }}>{lead.urgency_score ?? '—'}</span>
          <span className="text-[9px] font-medium" style={{ color: urgency.color }}>pts</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-white">{lead.customer_name}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: urgency.bg, color: urgency.color }}>
              {urgency.label}
            </span>
            {lead.sewage_involved && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#dc262620', color: '#dc2626' }}>
                <AlertTriangle size={9} className="inline mr-0.5" />Sewage
              </span>
            )}
            {lead.standing_water && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>
                🌊 Water
              </span>
            )}
            {lead.visible_mold && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                🦠 Mold
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="text-xs flex items-center gap-1 hover:text-white transition" style={{ color: '#7ba3c8' }}>
                <Phone size={10} />{lead.phone}
              </a>
            )}
            {lead.service_needed && (
              <span className="text-xs" style={{ color: '#7ba3c8' }}>📋 {lead.service_needed}</span>
            )}
            {lead.city && (
              <span className="text-xs flex items-center gap-1" style={{ color: '#7ba3c8' }}>
                <MapPin size={10} />{lead.city}{lead.state ? `, ${lead.state}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status selector */}
          <select
            value={lead.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            style={{ background: status.bg, borderColor: status.color + '80', color: status.color }}>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value} style={{ background: '#0d1829', color: '#fff' }}>{s.label}</option>
            ))}
          </select>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-white transition">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: '#1e2d45' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lead.email && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <a href={`mailto:${lead.email}`} className="text-sm" style={{ color: '#7ba3c8' }}>{lead.email}</a>
              </div>
            )}
            {address && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Address</p>
                <p className="text-sm text-white">{address}</p>
              </div>
            )}
            {lead.insurance_involved && lead.insurance_company && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Insurance</p>
                <p className="text-sm text-white">{lead.insurance_company}</p>
              </div>
            )}
            {lead.what_happened && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500 mb-1">What Happened</p>
                <p className="text-sm leading-relaxed" style={{ color: '#c8d9eb' }}>{lead.what_happened}</p>
              </div>
            )}
          </div>

          {/* Hazard flags */}
          {(lead.standing_water || lead.visible_mold || lead.sewage_involved) && (
            <div className="flex flex-wrap gap-2">
              {lead.standing_water && <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#ef444420', color: '#ef4444' }}>🌊 Standing Water</span>}
              {lead.visible_mold && <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#f59e0b20', color: '#f59e0b' }}>🦠 Visible Mold</span>}
              {lead.sewage_involved && <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#dc262620', color: '#dc2626' }}>⚠️ Sewage Involved</span>}
            </div>
          )}

          {/* Urgency reasons */}
          {lead.urgency_reasons?.length > 0 && (
            <div className="rounded-xl border p-3 space-y-1" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <p className="text-xs font-bold mb-2" style={{ color: urgency.color }}>Urgency Score Breakdown</p>
              {lead.urgency_reasons.map((r, i) => (
                <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: '#c8d9eb' }}>
                  <AlertTriangle size={9} style={{ color: urgency.color }} /> {r}
                </p>
              ))}
            </div>
          )}

          {/* Photos */}
          {lead.photos?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Photos ({lead.photos.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {lead.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="rounded-lg aspect-square object-cover w-full hover:opacity-80 transition" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}