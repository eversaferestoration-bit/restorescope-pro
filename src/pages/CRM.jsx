import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Plus, Search } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import CRMKanban from '@/pages/crm/CRMKanban';
import NewLeadModal from '@/pages/crm/NewLeadModal';

const STAGES = [
  { id: 'new', label: 'New', color: '#3b82f6' },
  { id: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { id: 'inspection_scheduled', label: 'Inspection Scheduled', color: '#f59e0b' },
  { id: 'estimate_sent', label: 'Estimate Sent', color: '#ec4899' },
  { id: 'follow_up', label: 'Follow Up', color: '#06b6d4' },
  { id: 'won', label: 'Won', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#6b7280' },
];

export default function CRM() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [showNewLead, setShowNewLead] = useState(false);
  const [search, setSearch] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', companyId],
    queryFn: () => base44.entities.Lead.filter({
      company_id: companyId,
      is_deleted: false,
    }, '-created_date', 500),
    enabled: !!companyId,
  });

  const filteredLeads = search
    ? leads.filter(l => 
        l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) ||
        l.email?.toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const leadsByStage = STAGES.map(stage => ({
    ...stage,
    leads: filteredLeads.filter(l => l.pipeline_stage === stage.id),
  }));

  const handleLeadCreated = () => {
    setShowNewLead(false);
    qc.invalidateQueries({ queryKey: ['leads', companyId] });
    toast({ title: '✅ Lead created' });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <button
            onClick={() => setShowNewLead(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition hover:opacity-90"
            style={{ background: '#3b82f6' }}>
            <Plus size={16} /> New Lead
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <CRMKanban stages={leadsByStage} isLoading={isLoading} />
      </div>

      {/* New Lead Modal */}
      {showNewLead && (
        <NewLeadModal
          companyId={companyId}
          onClose={() => setShowNewLead(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  );
}