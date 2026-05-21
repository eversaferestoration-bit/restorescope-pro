import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Users, AlertTriangle } from 'lucide-react';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';

import LeadCaptureForm from './leads/LeadCaptureForm';
import LeadCard from './leads/LeadCard';

const STATUS_OPTIONS = [
  { value: 'all',                  label: 'All' },
  { value: 'new',                  label: 'New' },
  { value: 'contacted',            label: 'Contacted' },
  { value: 'inspection_scheduled', label: 'Inspection' },
  { value: 'estimate_sent',        label: 'Estimate Sent' },
  { value: 'won',                  label: 'Won' },
  { value: 'lost',                 label: 'Lost' },
];

const URGENCY_FILTERS = [
  { value: 'all',      label: 'All Urgency' },
  { value: 'critical', label: '🔴 Critical' },
  { value: 'high',     label: '🟠 High' },
  { value: 'medium',   label: '🟡 Medium' },
  { value: 'low',      label: '🟢 Low' },
];

export default function RRLeadCapture() {
  const { user, companyId, profileLoading, isReady } = useRRCompany();

  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['emergency-leads', companyId],
    queryFn: () => base44.entities.EmergencyLead.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  const filtered = leads.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (urgencyFilter !== 'all' && l.urgency_level !== urgencyFilter) return false;
    return true;
  });

  const critical = leads.filter(l => l.urgency_level === 'critical' && l.status === 'new');
  const newLeads = leads.filter(l => l.status === 'new');
  const wonLeads = leads.filter(l => l.status === 'won');

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} style={{ color: '#e05a1c' }} /> Emergency Lead Capture
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
            Capture inbound leads, auto-score urgency, and track through to close
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
          style={{ background: '#e05a1c' }}>
          {showForm ? 'Hide Form' : '+ New Lead'}
        </button>
      </div>

      {/* Critical alert banner */}
      {critical.length > 0 && (
        <div className="rounded-xl border px-5 py-4 flex items-center gap-3"
          style={{ background: '#dc262615', borderColor: '#dc262650' }}>
          <AlertTriangle size={18} style={{ color: '#dc2626' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#dc2626' }}>
              {critical.length} Critical Lead{critical.length > 1 ? 's' : ''} Need Immediate Attention
            </p>
            <p className="text-xs" style={{ color: '#fca5a5' }}>
              {critical.map(l => l.customer_name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: leads.length, color: '#7ba3c8' },
          { label: 'New', value: newLeads.length, color: '#3b82f6' },
          { label: 'Critical', value: critical.length, color: '#dc2626' },
          { label: 'Won', value: wonLeads.length, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form (collapsible) */}
      {showForm && (
        <LeadCaptureForm companyId={companyId} onCreated={() => setShowForm(false)} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className="text-xs px-3 py-1.5 rounded-lg border transition"
              style={statusFilter === s.value
                ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px mx-1 hidden sm:block" style={{ background: '#1e2d45' }} />
        <div className="flex flex-wrap gap-1.5">
          {URGENCY_FILTERS.map(u => (
            <button key={u.value} onClick={() => setUrgencyFilter(u.value)}
              className="text-xs px-3 py-1.5 rounded-lg border transition"
              style={urgencyFilter === u.value
                ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#1e2d45' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border py-14 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <Users size={32} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
          <p className="text-white font-semibold">No leads found</p>
          <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>
            {leads.length === 0 ? 'Capture your first emergency lead above' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      )}
    </div>
    </RRAccessGate>
  );
}