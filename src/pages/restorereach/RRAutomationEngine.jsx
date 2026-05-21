import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import AutomationRuleCard from './automation/AutomationRuleCard';
import AutomationBuilder from './automation/AutomationBuilder';
import { TRIGGERS, ACTIONS, getTrigger, getAction } from './automation/automationConfig';
import { Zap, PlusCircle, Play, Pause, ChevronRight } from 'lucide-react';

const TEMPLATE_RULES = [
  {
    rule_name: 'Auto GBP Post on New Lead',
    trigger_type: 'new_lead',
    actions: [{ action_type: 'generate_gbp_post', params: { service: 'Emergency Restoration' } }],
    enabled: true, conditions: [],
  },
  {
    rule_name: 'Review Request After Job',
    trigger_type: 'completed_job',
    actions: [{ action_type: 'create_review_request', params: { delay_hours: '24' } }],
    enabled: true, conditions: [],
  },
  {
    rule_name: 'Storm Alert Campaign',
    trigger_type: 'storm_event_created',
    actions: [
      { action_type: 'create_campaign', params: { campaign_name: 'Storm Response', campaign_type: 'storm_alert' } },
      { action_type: 'generate_gbp_post', params: { service: 'Storm Damage' } },
    ],
    enabled: true, conditions: [],
  },
  {
    rule_name: 'Low Visibility Email Alert',
    trigger_type: 'low_visibility_score',
    actions: [{ action_type: 'send_email_alert', params: { to_email: '', subject: 'Action Required: Low Visibility Score' } }],
    enabled: false, conditions: [],
  },
];

export default function RRAutomationEngine() {
  const { companyId, profileLoading, isReady } = useRRCompany();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [filter, setFilter] = useState('all'); // all | active | paused

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', companyId],
    queryFn: () => base44.entities.AutomationRule.filter({ company_id: companyId, is_deleted: false }, '-created_date', 100),
    enabled: !!companyId,
  });

  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter(r => r.enabled).length,
    paused: rules.filter(r => !r.enabled).length,
    totalRuns: rules.reduce((s, r) => s + (r.run_count || 0), 0),
  }), [rules]);

  const filtered = filter === 'active' ? rules.filter(r => r.enabled)
    : filter === 'paused' ? rules.filter(r => !r.enabled)
    : rules;

  const handleEdit = (rule) => { setEditingRule(rule); setShowBuilder(true); };
  const handleNew  = () => { setEditingRule(null); setShowBuilder(true); };
  const handleClose = () => { setShowBuilder(false); setEditingRule(null); };

  const handleUseTemplate = async (tpl) => {
    await base44.entities.AutomationRule.create({ ...tpl, company_id: companyId });
    // refetch is handled by query invalidation in builder — trigger manually
    window.location.reload(); // simple approach
  };

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap size={22} style={{ color: '#e05a1c' }} /> Automation Engine
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
              Build event-driven rules that auto-execute marketing actions
            </p>
          </div>
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
            style={{ background: '#e05a1c' }}>
            <PlusCircle size={14} /> New Automation
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Rules',  value: stats.total,    color: '#c8d9eb', bg: '#1e2d4580' },
            { label: 'Active',       value: stats.active,   color: '#10b981', bg: '#10b98120' },
            { label: 'Paused',       value: stats.paused,   color: '#f59e0b', bg: '#f59e0b20' },
            { label: 'Total Runs',   value: stats.totalRuns,color: '#3b82f6', bg: '#3b82f620' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border p-4 text-center" style={{ background: s.bg, borderColor: s.color + '30' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Builder */}
        {showBuilder && (
          <AutomationBuilder companyId={companyId} editing={editingRule} onClose={handleClose} />
        )}

        {/* Templates (show only when no rules exist) */}
        {!isLoading && rules.length === 0 && !showBuilder && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
              <p className="text-sm font-bold text-white">🚀 Starter Templates</p>
              <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>Click to add a pre-built automation to your account</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATE_RULES.map((tpl, i) => {
                const trig = getTrigger(tpl.trigger_type);
                return (
                  <button key={i} onClick={() => handleUseTemplate(tpl)}
                    className="flex items-start gap-3 p-3.5 rounded-xl border text-left hover:border-orange-500/50 transition group"
                    style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                    <span className="text-xl">{trig.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white mb-1">{tpl.rule_name}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: trig.bg, color: trig.color }}>{trig.label}</span>
                        {tpl.actions.map((a, j) => {
                          const ac = getAction(a.action_type);
                          return (
                            <span key={j} className="flex items-center gap-0.5 text-xs" style={{ color: '#3a5a7c' }}>
                              <ChevronRight size={10} />
                              <span style={{ color: ac.color }}>{ac.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <PlusCircle size={14} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition" style={{ color: '#e05a1c' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {rules.length > 0 && (
          <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
            {[
              { key: 'all',    label: `All (${stats.total})` },
              { key: 'active', label: `Active (${stats.active})`,  icon: Play,  color: '#10b981' },
              { key: 'paused', label: `Paused (${stats.paused})`,  icon: Pause, color: '#f59e0b' },
            ].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={filter === t.key
                  ? { background: t.color || '#e05a1c', color: '#fff' }
                  : { color: '#7ba3c8' }}>
                {t.icon && <t.icon size={10} />}
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#1e2d45' }} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && rules.length === 0 && (
          <div className="rounded-2xl border py-16 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <Zap size={36} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
            <p className="text-base font-bold text-white mb-1">No automations yet</p>
            <p className="text-sm mb-5" style={{ color: '#7ba3c8' }}>
              Create your first rule to automate marketing actions
            </p>
            <button onClick={handleNew}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#e05a1c' }}>
              <PlusCircle size={14} className="inline mr-1.5" /> Create First Automation
            </button>
          </div>
        )}

        {/* Rule cards */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(rule => (
              <AutomationRuleCard key={rule.id} rule={rule} onEdit={handleEdit} />
            ))}
          </div>
        )}

        {/* Trigger reference */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
            <p className="text-sm font-bold text-white">Supported Triggers & Actions</p>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#3a5a7c' }}>Triggers</p>
              <div className="space-y-1.5">
                {TRIGGERS.map(t => (
                  <div key={t.key} className="flex items-center gap-2.5 text-xs">
                    <span className="w-5 text-center">{t.icon}</span>
                    <span className="font-semibold" style={{ color: t.color }}>{t.label}</span>
                    <span className="ml-auto" style={{ color: '#3a5a7c' }}>{t.description}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#3a5a7c' }}>Actions</p>
              <div className="space-y-1.5">
                {ACTIONS.map(a => (
                  <div key={a.key} className="flex items-center gap-2.5 text-xs">
                    <span className="w-5 text-center">{a.icon}</span>
                    <span className="font-semibold" style={{ color: a.color }}>{a.label}</span>
                    <span className="ml-auto" style={{ color: '#3a5a7c' }}>{a.description}</span>
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