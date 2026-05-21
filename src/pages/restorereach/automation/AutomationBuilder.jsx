import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { TRIGGERS, ACTIONS, getTrigger, getAction } from './automationConfig';
import { PlusCircle, Trash2, X, Save, ArrowRight, PlusSquare } from 'lucide-react';

const inp = 'w-full px-3 py-2.5 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45' };

function TriggerPicker({ value, onChange }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#7ba3c8' }}>1. Choose Trigger</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TRIGGERS.map(t => (
          <button key={t.key} type="button" onClick={() => onChange(t.key)}
            className="flex items-start gap-3 p-3 rounded-xl border text-left transition"
            style={value === t.key
              ? { background: t.bg, borderColor: t.color + '80' }
              : { background: '#0a1020', borderColor: '#1e2d45' }}>
            <span className="text-xl">{t.icon}</span>
            <div>
              <p className="text-xs font-bold" style={{ color: value === t.key ? t.color : '#c8d9eb' }}>{t.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#3a5a7c' }}>{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionBlock({ action, index, onChange, onRemove }) {
  const a = getAction(action.action_type);
  const params = ACTIONS.find(ac => ac.key === action.action_type)?.params || [];

  return (
    <div className="rounded-xl border p-3 space-y-2.5" style={{ background: '#0a1020', borderColor: a.color + '50' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{a.icon}</span>
          <p className="text-xs font-bold" style={{ color: a.color }}>Action {index + 1}: {a.label}</p>
        </div>
        <button type="button" onClick={onRemove} className="p-1 hover:bg-white/10 rounded transition" style={{ color: '#ef4444' }}>
          <Trash2 size={12} />
        </button>
      </div>
      {params.map(p => (
        <div key={p.key}>
          <label className="text-xs font-semibold block mb-1" style={{ color: '#7ba3c8' }}>
            {p.label}{p.required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <input className={inp} style={inpStyle} placeholder={p.placeholder}
            value={action.params?.[p.key] || ''}
            onChange={e => onChange({ ...action, params: { ...(action.params || {}), [p.key]: e.target.value } })} />
        </div>
      ))}
    </div>
  );
}

function ActionPicker({ onAdd }) {
  const [open, setOpen] = useState(false);
  if (!open) return (
    <button type="button" onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition w-full"
      style={{ borderColor: '#1e2d45', borderStyle: 'dashed', color: '#7ba3c8' }}>
      <PlusSquare size={14} /> Add Action
    </button>
  );
  return (
    <div className="rounded-xl border p-3" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
      <p className="text-xs font-bold mb-2" style={{ color: '#7ba3c8' }}>Choose action to add:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {ACTIONS.map(a => (
          <button key={a.key} type="button"
            onClick={() => { onAdd({ action_type: a.key, params: {} }); setOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs transition text-left"
            style={{ background: a.bg, borderColor: a.color + '50', color: '#fff' }}>
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(false)} className="mt-2 text-xs" style={{ color: '#3a5a7c' }}>Cancel</button>
    </div>
  );
}

const BLANK_RULE = { rule_name: '', trigger_type: 'new_lead', conditions: [], actions: [], enabled: true };

export default function AutomationBuilder({ companyId, editing, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(editing
    ? { rule_name: editing.rule_name, trigger_type: editing.trigger_type, conditions: editing.conditions || [], actions: editing.actions || [], enabled: editing.enabled }
    : { ...BLANK_RULE }
  );

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: data => editing
      ? base44.entities.AutomationRule.update(editing.id, data)
      : base44.entities.AutomationRule.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'], exact: false });
      toast({ title: editing ? 'Automation updated' : 'Automation created' });
      onClose();
    },
  });

  const handleSave = () => {
    if (!form.rule_name.trim()) { toast({ title: 'Rule name is required', variant: 'destructive' }); return; }
    if (!form.trigger_type) { toast({ title: 'Choose a trigger', variant: 'destructive' }); return; }
    if (!form.actions.length) { toast({ title: 'Add at least one action', variant: 'destructive' }); return; }
    mutation.mutate(form);
  };

  const updateAction = (i, val) => setForm(f => ({ ...f, actions: f.actions.map((a, idx) => idx === i ? val : a) }));
  const removeAction = i => setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));
  const addAction = act => setForm(f => ({ ...f, actions: [...f.actions, act] }));

  const trigger = getTrigger(form.trigger_type);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#2a3f5f' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="text-sm font-bold text-white">{editing ? 'Edit Automation' : 'New Automation'}</span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition" style={{ color: '#3a5a7c' }}>
          <X size={15} />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Name */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: '#7ba3c8' }}>Rule Name</label>
          <input className={inp} style={inpStyle} placeholder="e.g. Auto follow-up after new lead"
            value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} />
        </div>

        {/* Trigger picker */}
        <TriggerPicker value={form.trigger_type} onChange={set('trigger_type')} />

        {/* Actions */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#7ba3c8' }}>2. Configure Actions</p>

          {/* Preview flow */}
          {(form.actions.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap mb-3 p-3 rounded-xl border"
              style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold"
                style={{ background: trigger.bg, borderColor: trigger.color + '60', color: trigger.color }}>
                {trigger.icon} {trigger.label}
              </div>
              {form.actions.map((act, i) => {
                const a = getAction(act.action_type);
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <ArrowRight size={12} style={{ color: '#3a5a7c' }} />
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold"
                      style={{ background: a.bg, borderColor: a.color + '60', color: a.color }}>
                      {a.icon} {a.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {form.actions.map((act, i) => (
              <ActionBlock key={i} action={act} index={i}
                onChange={val => updateAction(i, val)}
                onRemove={() => removeAction(i)} />
            ))}
            <ActionPicker onAdd={addAction} />
          </div>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between py-2 px-3 rounded-xl border" style={{ borderColor: '#1e2d45' }}>
          <div>
            <p className="text-sm font-semibold text-white">Enable automation</p>
            <p className="text-xs mt-0.5" style={{ color: '#3a5a7c' }}>Active automations fire when conditions are met</p>
          </div>
          <button type="button" onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className="relative w-10 h-6 rounded-full transition-colors"
            style={{ background: form.enabled ? '#10b981' : '#1e2d45' }}>
            <span className="absolute top-1 transition-all w-4 h-4 rounded-full bg-white shadow"
              style={{ left: form.enabled ? '22px' : '4px' }} />
          </button>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={mutation.isPending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {mutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save size={14} />}
          {mutation.isPending ? 'Saving…' : editing ? 'Update Automation' : 'Create Automation'}
        </button>
      </div>
    </div>
  );
}