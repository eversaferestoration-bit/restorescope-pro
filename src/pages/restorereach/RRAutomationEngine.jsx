import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import AutomationRuleCard from './automation/AutomationRuleCard';
import AutomationBuilder from './automation/AutomationBuilder';
import { toast } from '@/components/ui/use-toast';
import { Cpu, PlusCircle, Zap, Play, Pause } from 'lucide-react';
import { TRIGGERS, ACTIONS } from './automation/automationConfig';

const STARTER_TEMPLATES = [
  {
    rule_name: 'Auto GBP Post on New Lead',
    trigger_type: 'new_lead',
    conditions: [],
    actions: [{ action_type: 'generate_gbp_post', params: { service: 'Emergency Restoration' } }],
    enabled: true,
  },
  {
    rule_name: 'Review Request After Completed Job',
    trigger_type: 'completed_job',
    conditions: [],
    actions: [{ action_type: 'create_review_request', params: { delay_hours: '24' } }],
    enabled: true,
  },
  {
    rule_name: 'Storm Alert Campaign',
    trigger_type: 'storm_event_created',
    conditions: [],
    actions: [
      { action_type: 'create_campaign', params: { campaign_name: 'Storm Response', campaign_type: 'storm_alert' } },
      { action_type: 'generate_gbp_post', params: { service: 'Storm Damage' } },
    ],
    enabled: true,
  },
  {
    rule_name: 'Low Visibility Alert',
    trigger_type: 'low_visibility_score',
    conditions: [],
    actions: [{ action_type: 'send_email_alert', params: { subject: 'Action Required: Low Visibility Score' } }],
    enabled: true,
  },
  {
    rule_name: 'Weekly GBP Post Reminder',
    trigger_type: 'no_gbp_posts_7days',
    conditions: [],
    actions: [{ action_type: 'generate_gbp_post', params: { service: 'Water Damage Restoration' } }],
    enabled: true,
  },
];

export default function RRAutomationEngine() {
  const { companyId, profileLoading, isReady } = useRRCompany();
  const qc = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', companyId],
    queryFn: () => base44.entities.AutomationRule.filter({ company_id: companyId, is_deleted: false }, '-created_date', 100),
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (rule) => {
      if (rule.id) {
        return base44.entities.AutomationRule.update(rule.id, rule);
      }
      return base44.entities.AutomationRule.create({ ...rule, company_id: companyId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'], exact: false });
      toast({ title: editingRule?.id ? '✅ Automation updated' : '✅ Automation created' });
      setShowBuilder(false);
      setEditingRule(null);
    },
  });

  const createTemplate = useMutation({
    mutationFn: t => base44.entities.AutomationRule.create({ ...t, company_id: companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'], exact: false });
      toast({ title: '✅ Template added' });
    },
  });

  const handleEdit = (rule) => { setEditingRule(rule); setShowBuilder(true); };
  const handleNew = () => { setEditingRule(null); setShowBuilder(true); };
  const handleCancel = () => { setShowBuilder(false); setEditingRule(null); };

  const activeCount = rules.filter(r => r.enabled).length;
  const totalRuns = rules.reduce((s, r) => s + (r.run_count || 0), 0);

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Cpu size={22} style={{ color: '#e05a1c' }} /> Automation Engine
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
              Build trigger-based workflows that run your marketing on autopilot
            </p>
          </div>
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
            style={{ background: '#e05a1c' }}>
            <PlusCircle size={14} /> New Automation
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Rules', value: rules.length, color: '#3b82f6' },
            { label: 'Active', value: activeCount, color: '#10b981', icon: Play },
            { label: 'Total Runs', value: totalRuns, color: '#e05a1c', icon: Zap },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border p-4 text-center"
              style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Builder */}
        {showBuilder && (
          <AutomationBuilder
            initial={editingRule}
            onSave={rule => saveMutation.mutate(rule)}
            onCancel={handleCancel}
            saving={saveMutation.isPending}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: '#1e2d45' }} />)}
          </div>
        )}

        {/* Rules */}
        {!isLoading && rules.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>
                Your Automations ({rules.length})
              </h2>
            </div>
            {rules.map(r => (
              <AutomationRuleCard key={r.id} rule={r} onEdit={handleEdit} />
            ))}
          </div>
        )}

        {/* Empty + Templates */}
        {!isLoading && rules.length === 0 && !showBuilder && (
          <div className="space-y-4">
            <div className="rounded-2xl border py-12 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
              <Cpu size={40} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
              <p className="text-base font-bold text-white mb-1">No automations yet</p>
              <p className="text-sm mb-5" style={{ color: '#7ba3c8' }}>
                Set up trigger-based workflows to automate your marketing
              </p>
              <button onClick={handleNew}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#e05a1c' }}>
                <PlusCircle size={14} className="inline mr-1.5" /> Create First Automation
              </button>
            </div>

            {/* Starter templates */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>
                Starter Templates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_TEMPLATES.map((t, i) => {
                  const trigger = TRIGGERS.find(tr => tr.key === t.trigger_type);
                  return (
                    <div key={i} className="rounded-xl border p-4 flex items-start gap-3"
                      style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
                      <span className="text-xl mt-0.5">{trigger?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white mb-0.5">{t.rule_name}</p>
                        <p className="text-xs mb-2" style={{ color: '#7ba3c8' }}>
                          {trigger?.label} → {t.actions.map(a => ACTIONS.find(ac => ac.key === a.action_type)?.label).filter(Boolean).join(' + ')}
                        </p>
                        <button onClick={() => createTemplate.mutate(t)}
                          disabled={createTemplate.isPending}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition hover:opacity-90"
                          style={{ background: '#e05a1c' }}>
                          Use Template
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Trigger reference */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
            <p className="text-sm font-bold text-white">Trigger & Action Reference</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#3a5a7c' }}>Triggers</p>
              <div className="space-y-1.5">
                {TRIGGERS.map(t => (
                  <div key={t.key} className="flex items-center gap-2 text-xs">
                    <span>{t.icon}</span>
                    <span style={{ color: '#c8d9eb' }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#3a5a7c' }}>Actions</p>
              <div className="space-y-1.5">
                {ACTIONS.map(a => (
                  <div key={a.key} className="flex items-center gap-2 text-xs">
                    <span>{a.icon}</span>
                    <span style={{ color: '#c8d9eb' }}>{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </RRAccessGate>
  );
}