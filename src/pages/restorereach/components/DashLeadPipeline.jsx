import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Phone, Eye, Edit2, ChevronDown } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const URGENCY_STYLES = {
  emergency: 'bg-red-500/20 text-red-400 border border-red-500/30',
  urgent: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  standard: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  quote_only: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const STATUS_STYLES = {
  new: 'bg-green-500/20 text-green-400',
  contacted: 'bg-yellow-500/20 text-yellow-400',
  qualified: 'bg-blue-500/20 text-blue-400',
  converted: 'bg-purple-500/20 text-purple-400',
  lost: 'bg-slate-500/20 text-slate-400',
};

function getCityFromAddress(address) {
  if (!address) return '—';
  const parts = address.split(',');
  return parts.length >= 2 ? parts[parts.length - 2].trim() : parts[0].trim();
}

function LeadRow({ lead }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RRLeadCapture.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-leads'] });
      setEditing(false);
      toast({ title: 'Status updated' });
    },
  });

  const dateStr = lead.created_date || lead.created_at;
  const dateLabel = dateStr ? format(new Date(dateStr), 'MMM d') : '—';

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
        {getCityFromAddress(lead.property_address)}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${URGENCY_STYLES[lead.urgency_level] || URGENCY_STYLES.standard}`}>
          {lead.urgency_level?.replace('_', ' ') || 'standard'}
        </span>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <select
            defaultValue={lead.status}
            autoFocus
            onBlur={() => setEditing(false)}
            onChange={(e) => updateStatus.mutate({ id: lead.id, status: e.target.value })}
            className="text-xs px-2 py-1 rounded-lg border text-white focus:outline-none"
            style={{ background: '#1e2d45', borderColor: '#2e4060' }}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[lead.status] || STATUS_STYLES.new}`}>
            {lead.status || 'new'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs hidden lg:table-cell" style={{ color: '#3a5a7c' }}>{dateLabel}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Link to="/restorereach/leads"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition"
            style={{ background: '#1e2d45', color: '#7ba3c8' }}
            title="View Lead">
            <Eye size={11} /> <span className="hidden sm:inline">View</span>
          </Link>
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition hover:text-orange-400"
            style={{ background: '#1e2d45', color: '#7ba3c8' }}
            title="Update Status">
            <Edit2 size={11} /> <span className="hidden sm:inline">Status</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function DashLeadPipeline({ leads, loading }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? leads : leads.slice(0, 8);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Phone size={15} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">Lead Pipeline</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{leads.length}</span>
        </div>
        <Link to="/restorereach/leads" className="text-xs flex items-center gap-1 hover:text-orange-400 transition" style={{ color: '#7ba3c8' }}>
          All leads <ArrowRight size={11} />
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
          <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Capture your first lead to see it here</p>
          <Link to="/restorereach/leads"
            className="inline-flex items-center gap-1.5 mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
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
                  <th className="px-4 py-3 text-left">Actions</th>
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
                <ChevronDown size={12} className={showAll ? 'rotate-180' : ''} />
                {showAll ? 'Show less' : `Show ${leads.length - 8} more`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ArrowRight({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}