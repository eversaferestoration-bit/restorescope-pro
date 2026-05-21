import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Zap } from 'lucide-react';

import LeadCaptureForm from './leads/LeadCaptureForm';
import LeadPipeline from './leads/LeadPipeline';

const URGENCY_CONFIG = {
  emergency:  { label: 'Emergency', color: '#dc2626' },
  urgent:     { label: 'Urgent',    color: '#ef4444' },
  standard:   { label: 'Standard',  color: '#f59e0b' },
  quote_only: { label: 'Quote',     color: '#7ba3c8' },
};

export default function RRLeadCapture() {
  const { user } = useAuth();
  const companyId = user?.email || 'default';
  const [filter, setFilter] = useState('all');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['rr-leads'],
    queryFn: () => base44.entities.RRLeadCapture.list('-created_date', 100),
  });

  const total = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const won = leads.filter(l => l.status === 'won').length;
  const emergency = leads.filter(l => l.urgency_level === 'emergency' || l.urgency_level === 'urgent').length;
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <div className="p-5 md:p-7 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={22} style={{ color: '#e05a1c' }} /> Emergency Lead Capture
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Capture inbound leads, auto-score urgency, and track through the pipeline
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: total, color: '#7ba3c8' },
          { label: 'New / Uncontacted', value: newLeads, color: '#3b82f6' },
          { label: 'Emergency / Urgent', value: emergency, color: '#ef4444' },
          { label: 'Conversion Rate', value: `${convRate}%`, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Emergency banner */}
      {newLeads > 0 && emergency > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border" style={{ background: '#dc262615', borderColor: '#dc262640' }}>
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: '#dc2626' }} />
          <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
            {emergency} emergency/urgent lead{emergency > 1 ? 's' : ''} require immediate attention
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <LeadCaptureForm companyId={companyId} />
        </div>
        <div className="xl:col-span-3">
          <LeadPipeline
            leads={leads}
            isLoading={isLoading}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
      </div>
    </div>
  );
}