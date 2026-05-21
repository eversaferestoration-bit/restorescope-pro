import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import LeadDetailTabs from '@/pages/crm/LeadDetailTabs';

export default function CRMLeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: () => base44.entities.CRMLead.get(leadId),
    enabled: !!leadId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['lead-notes', leadId],
    queryFn: () => base44.entities.LeadNote.filter({ lead_id: leadId, is_deleted: false }, '-created_date', 100),
    enabled: !!leadId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: () => base44.entities.LeadTask.filter({ lead_id: leadId, is_deleted: false }, '-created_date', 50),
    enabled: !!leadId,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['lead-reminders', leadId],
    queryFn: () => base44.entities.LeadReminder.filter({ lead_id: leadId, is_deleted: false }, '-created_date', 50),
    enabled: !!leadId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => base44.entities.LeadActivity.filter({ lead_id: leadId, is_deleted: false }, '-created_date', 100),
    enabled: !!leadId,
  });

  const updateStageMutation = useMutation({
    mutationFn: (stage) => base44.functions.invoke('updateLeadStage', { lead_id: leadId, stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      toast({ title: '✅ Stage updated' });
    },
  });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!lead) return <div className="p-6">Lead not found</div>;

  const STAGES = ['new', 'contacted', 'inspection_scheduled', 'estimate_sent', 'follow_up', 'won', 'lost'];
  const STAGE_LABELS = { new: 'New', contacted: 'Contacted', inspection_scheduled: 'Inspection Scheduled', estimate_sent: 'Estimate Sent', follow_up: 'Follow Up', won: 'Won', lost: 'Lost' };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{lead.customer_name}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            {lead.phone && <div className="flex items-center gap-1"><Phone size={16} />{lead.phone}</div>}
            {lead.email && <div className="flex items-center gap-1"><Mail size={16} />{lead.email}</div>}
            {lead.property_address && <div className="flex items-center gap-1"><MapPin size={16} />{lead.property_address}</div>}
            {lead.estimated_value && <div className="flex items-center gap-1"><DollarSign size={16} />${lead.estimated_value.toLocaleString()}</div>}
          </div>
        </div>
      </div>

      {/* Pipeline Stage Selector */}
      <div className="mb-6 p-4 bg-card rounded-lg border">
        <p className="text-xs font-semibold mb-2">PIPELINE STAGE</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map(stage => (
            <button key={stage}
              onClick={() => updateStageMutation.mutate(stage)}
              disabled={updateStageMutation.isPending}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                lead.pipeline_stage === stage
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}>
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </div>

      {/* Active Reminders */}
      {reminders.filter(r => !r.is_dismissed).length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm mb-2">Active Reminders</p>
              {reminders.filter(r => !r.is_dismissed).map(r => (
                <p key={r.id} className="text-sm text-destructive mb-1">• {r.description}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <LeadDetailTabs lead={lead} notes={notes} tasks={tasks} activities={activities} leadId={leadId} />
    </div>
  );
}