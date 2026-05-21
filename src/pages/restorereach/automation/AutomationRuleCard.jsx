import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { getTrigger, getAction } from './automationConfig';
import { ArrowRight, Play, Pause, Copy, Pencil, Trash2, Zap, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AutomationRuleCard({ rule, onEdit }) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: data => base44.entities.AutomationRule.update(rule.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'], exact: false }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.AutomationRule.update(rule.id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'], exact: false });
      toast({ title: 'Automation deleted' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => {
      const { id, created_date, last_triggered, run_count, ...rest } = rule;
      return base44.entities.AutomationRule.create({
        ...rest,
        rule_name: rule.rule_name + ' (Copy)',
        enabled: false,
        run_count: 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'], exact: false });
      toast({ title: 'Automation duplicated' });
    },
  });

  const trigger = getTrigger(rule.trigger_type);
  const actions = rule.actions || [];

  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: '#0d1829',
        borderColor: rule.enabled ? '#2a3f5f' : '#1e2d45',
        opacity: rule.enabled ? 1 : 0.65,
      }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg shrink-0">{trigger.icon}</span>
          <p className="text-sm font-bold text-white truncate">{rule.rule_name}</p>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
            style={{
              background: rule.enabled ? '#10b98120' : '#1e2d45',
              color: rule.enabled ? '#10b981' : '#3a5a7c',
            }}>
            {rule.enabled ? '● Active' : '● Paused'}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <button onClick={() => updateMutation.mutate({ enabled: !rule.enabled })}
            disabled={updateMutation.isPending}
            title={rule.enabled ? 'Pause' : 'Enable'}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
            style={{ color: rule.enabled ? '#f59e0b' : '#10b981' }}>
            {rule.enabled ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button onClick={() => onEdit(rule)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{ color: '#7ba3c8' }}>
            <Pencil size={13} />
          </button>
          <button onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{ color: '#7ba3c8' }}>
            <Copy size={13} />
          </button>
          <button
            onClick={() => { if (window.confirm('Delete this automation?')) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{ color: '#ef4444' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Flow row */}
      <div className="px-4 py-4 flex items-center gap-2 flex-wrap">
        {/* Trigger pill */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0"
          style={{ background: trigger.bg, borderColor: trigger.color + '60' }}>
          <span className="text-sm">{trigger.icon}</span>
          <div>
            <p className="text-xs font-bold leading-none mb-0.5" style={{ color: trigger.color }}>TRIGGER</p>
            <p className="text-xs font-semibold text-white leading-none">{trigger.label}</p>
          </div>
        </div>

        {/* Action pills */}
        {actions.map((act, i) => {
          const a = getAction(act.action_type);
          return (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <ArrowRight size={14} style={{ color: '#3a5a7c' }} />
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ background: a.bg, borderColor: a.color + '60' }}>
                <span className="text-sm">{a.icon}</span>
                <div>
                  <p className="text-xs font-bold leading-none mb-0.5" style={{ color: a.color }}>
                    ACTION {i + 1}
                  </p>
                  <p className="text-xs font-semibold text-white leading-none">{a.label}</p>
                </div>
              </div>
            </div>
          );
        })}

        {actions.length === 0 && (
          <div className="flex items-center gap-2">
            <ArrowRight size={14} style={{ color: '#3a5a7c' }} />
            <div className="px-3 py-2 rounded-xl border" style={{ borderColor: '#1e2d45', color: '#3a5a7c' }}>
              <p className="text-xs">No actions configured</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t" style={{ borderColor: '#1e2d45' }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#3a5a7c' }}>
          <Zap size={10} />
          <span>{rule.run_count || 0} runs</span>
        </div>
        {rule.last_triggered && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#3a5a7c' }}>
            <Calendar size={10} />
            <span>Last run {format(new Date(rule.last_triggered), 'MMM d, yyyy')}</span>
          </div>
        )}
        {(rule.conditions?.length > 0) && (
          <span className="text-xs" style={{ color: '#3a5a7c' }}>
            {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}