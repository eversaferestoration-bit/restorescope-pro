import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { GripVertical, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import KanbanColumn from '@/pages/crm/KanbanColumn';
import LeadCreateForm from '@/pages/crm/LeadCreateForm';

const STAGES = [
  { id: 'new', label: 'New', color: '#3b82f6' },
  { id: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { id: 'inspection_scheduled', label: 'Inspection Scheduled', color: '#f59e0b' },
  { id: 'estimate_sent', label: 'Estimate Sent', color: '#06b6d4' },
  { id: 'follow_up', label: 'Follow Up', color: '#ef4444' },
  { id: 'won', label: 'Won', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#6b7280' },
];

export default function CRMPipeline() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ['crm-leads', companyId],
    queryFn: () => base44.entities.CRMLead.filter({ company_id: companyId, is_deleted: false }, '-created_date', 500),
    enabled: !!companyId,
  });

  const updateStageMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateLeadStage', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
    },
    onError: (error) => {
      toast({ title: '❌ Failed to update', description: error?.message, variant: 'destructive' });
    },
  });

  const handleDragEnd = useCallback((lead, newStage) => {
    if (lead.pipeline_stage === newStage) return;
    updateStageMutation.mutate({ lead_id: lead.id, stage: newStage });
  }, [updateStageMutation]);

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter(l => l.pipeline_stage === stage.id).sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0));
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Lead Pipeline</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90">
          <Plus size={18} /> New Lead
        </button>
      </div>

      {showForm && <LeadCreateForm companyId={companyId} onClose={() => setShowForm(false)} />}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-5" style={{ minWidth: `${STAGES.length * 350 + 100}px` }}>
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id]}
              onDrop={(lead) => handleDragEnd(lead, stage.id)}
              count={leadsByStage[stage.id].length}
            />
          ))}
        </div>
      </div>
    </div>
  );
}