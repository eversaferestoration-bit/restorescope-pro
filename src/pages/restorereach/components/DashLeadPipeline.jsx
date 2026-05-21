import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Phone, ChevronDown } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

// EmergencyLead statuses
const STATUSES = ['new', 'contacted', 'inspection_scheduled', 'estimate_sent', 'won', 'lost'];

const STATUS_STYLES = {
  new:                  { color: '#3b82f6', bg: '#3b82f620', label: 'New' },
  contacted:            { color: '#f59e0b', bg: '#f59e0b20', label: 'Contacted' },
  inspection_scheduled: { color: '#8b5cf6', bg: '#8b5cf620', label: 'Inspection' },
  estimate_sent:        { color: '#06b6d4', bg: '#06b6d420', label: 'Estimate Sent' },
  won:                  { color: '#10b981', bg: '#10b98120', label: 'Won' },
  lost:                 { color: '#ef4444', bg: '#ef444420', label: 'Lost' },
};

const URGENCY_STYLES = {
  critical: { color: '#dc2626', bg: '#dc262620', label: 'CRITICAL' },
  high:     { color: '#ef4444', bg: '#ef444420', label: 'High' },
  medium:   { color: '#f59e0b', bg: '#f59e0b20', label: 'Medium' },
  low:      { color: '#10b981', bg: '#10b98120', label: 'Low' },
};

function LeadRow({ lead }) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.EmergencyLead.update(id, { status }),
    onSuccess: () => {
      // Invalidate all emergency-lead queries regardless of companyId segment
      qc.invalidateQueries({ queryKey: ['emergency-leads'], exact: false });
      toast({ title: 'Status updated' });
    },
  });

  const statusCfg = STATUS_STYLES[lead.status] || STATUS_STYLES.new;
  const urgencyCfg = URGENCY_STYLES[lead.urgency_level] || URGENCY_STYLES.medium;
  const dateLabel = lead.created_date ? format(new Date(lead.created_date), 'MMM d') : '—';
  const city = [lead.city, lead.state].filter(Boolean).join(', ') || '—';

  return (
    <tr className="border-b last:border-0 hover:bg-white/3 transition-colors" style={{ borderColor: '#1e2d45' }}>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-white">{lead.customer_name}</p>
        <p className="text-xs" style={{ color: '#7ba3c8' }}>{lead.phone || lead.email || '—'}</p>
      </td>
      <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: '#c8d9eb' }}>
        {lead.service_needed || '—'}
      </td>
      <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: '#7ba3c8' }}>
        {city}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: urgencyCfg.bg, color: urgencyCfg.color }}>
          {urgencyCfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <select
          value={lead.status || 'new'}
          onChange={(e) => updateStatus.mutate({ id: lead.id, status: e.target.value })}
          className="text-xs px-2 py-1.5 rounded-lg border focus:outline-none cursor-pointer"
          style={{ background: statusCfg.bg, borderColor: statusCfg.color + '80', color: statusCfg.color }}>
          {STATUSES.map(s => (
            <option key={s} value={s} style={{ background: '#0d1829', color: '#fff' }}>
              {STATUS_STYLES[s]?.label || s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-xs hidden lg:table-cell" style={{ color: '#3a5a7c' }}>{dateLabel}</td>
      <td className="px-4 py-3">
        <Link to="/restorereach/leads"
          className="text-xs px-2.5 py-1.5 rounded-lg transition hover:text-orange-400"
          style={{ background: '#1e2d45', color: '#7ba3c8' }}>
          View
        </Link>
      </td>
    </tr>
  );
}

export default function DashLeadPipeline({ leads, loading }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? leads : leads.slice(0, 8);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Phone size={15} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">Lead Pipeline</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{leads.length}</span>
        </div>
        <Link to="/restorereach/leads" className="text-xs hover:text-orange-400 transition" style={{ color: '#7ba3c8' }}>
          All leads →
        </Link>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="py-14 text-center">
          <Phone size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
          <p className="text-sm text-white font-medium">No leads yet</p>
          <p className="text-xs mt-1 mb-3" style={{ color: '#7ba3c8' }}>Capture your first lead to see it here</p>
          <Link to="/restorereach/leads"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
            style={{ background: '#e05a1c' }}>
            <Phone size={11} /> Capture Lead
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: '#1e2d45', color: '#3a5a7c' }}>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Service</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">City</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Urgency</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(lead => <LeadRow key={lead.id} lead={lead} />)}
              </tbody>
            </table>
          </div>
          {leads.length > 8 && (
            <div className="px-5 py-3 border-t" style={{ borderColor: '#1e2d45' }}>
              <button onClick={() => setShowAll(v => !v)}
                className="text-xs flex items-center gap-1 hover:text-orange-400 transition" style={{ color: '#7ba3c8' }}>
                <ChevronDown size={12} className={showAll ? 'rotate-180 transition-transform' : 'transition-transform'} />
                {showAll ? 'Show less' : `Show ${leads.length - 8} more`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}