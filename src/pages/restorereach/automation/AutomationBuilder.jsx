import { useState } from 'react';
import { TRIGGERS, ACTIONS } from './automationConfig';
import { ArrowRight, Plus, Trash2, X, Save, ChevronDown } from 'lucide-react';

const inp = 'w-full px-3 py-2 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition';
const inpStyle = { background: '#080f1a', borderColor: '#1e2d45' };

function TriggerPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = TRIGGERS.find(t => t.key === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left"
        style={{ background: '#0a1020', borderColor: selected ? selected.color + '60' : '#1e2d45' }}>
        <span className="text-xl">{selected?.icon || '⚡'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: selected?.color || '#3a5a7c' }}>TRIGGER</p>
          <p className="text-sm font-semibold text-white">{selected?.label || 'Select a trigger…'}</p>
        </div>
        <ChevronDown size={14} style={{ color: '#3a5a7c' }} />
      </button>
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border overflow-hidden shadow-2xl"
          style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          {TRIGGERS.map(t => (
            <button key={t.key} type="button"
              onClick={() => { onChange(t.key); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left border-b last:border-0"
              style={{ borderColor: '#1e2d4560' }}>
              <span>{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{t.label}</p>
                <p className="text-xs" style={{ color: '#7ba3c8' }}>{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBlock({ action, index, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const selected = ACTIONS.find(a => a.key === action.action_type);

  const setParam = (key, val) => onChange({ ...action, params: { ...(action.params || {}), [key]: val } });

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#080f1a', borderColor: selected ? selected.color + '40' : '#1e2d45' }}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="text-base">{selected?.icon || '⚙️'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: selected?.color || '#3a5a7c' }}>ACTION {index + 1}</p>
          <button type="button" onClick={() => setOpen(o => !o)}
            className="text-sm font-semibold text-white hover:underline text-left">
            {selected?.label || 'Select action…'}
          </button>
        </div>
        <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-white/10 transition" style={{ color: '#ef4444' }}>
          <Trash2 size={12} />
        </button>
      </div>

      {open && (
        <div className="border-t px-3 pb-3 space-y-2" style={{ borderColor: '#1e2d45' }}>
          {/* Action type picker */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2">
            {ACTIONS.map(a => (
              <button key={a.key} type="button"
                onClick={() => { onChange({ action_type: a.key, params: {} }); setOpen(false); }}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left transition"
                style={action.action_type === a.key
                  ? { background: a.bg, borderColor: a.color, color: a.color }
                  : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                <span className="text-sm">{a.icon}</span>
                <span className="text-xs font-semibold truncate">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Params */}
      {selected?.params?.length > 0 && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2" style={{ borderColor: '#1e2d4560' }}>
          {selected.params.map(p => (
            <div key={p.key}>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#7ba3c8' }}>
                {p.label}{p.required && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <input className={inp} style={inpStyle} placeholder={p.placeholder}
                value={action.params?.[p.key] || ''}
                onChange={e => setParam(p.key, e.target.value)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConditionRow({ condition, onChange, onRemove }) {
  const set = k => e => onChange({ ...condition, [k]: e.target.value });
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input className={inp + ' flex-1 min-w-0'} style={{ ...inpStyle, minWidth: 90 }}
        placeholder="field (e.g. urgency_level)" value={condition.field || ''} onChange={set('field')} />
      <select className={inp} style={{ ...inpStyle, width: 120 }} value={condition.operator || 'equals'} onChange={set('operator')}>
        <option value="equals">equals</option>
        <option value="not_equals">not equals</option>
        <option value="contains">contains</option>
        <option value="greater_than">greater than</option>
        <option value="less_than">less than</option>
      </select>
      <input className={inp + ' flex-1 min-w-0'} style={{ ...inpStyle, minWidth: 80 }}
        placeholder="value" value={condition.value || ''} onChange={set('value')} />
      <button type="button" onClick={onRemove} className="p-1.5 rounded hover:bg-white/10 transition shrink-0" style={{ color: '#ef4444' }}>
        <X size={12} />
      </button>
    </div>
  );
}

const BLANK_RULE = { rule_name: '', trigger_type: '', conditions: [], actions: [] };

export default function AutomationBuilder({ initial, onSave, onCancel, saving }) {
  const [rule, setRule] = useState(initial || BLANK_RULE);
  const set = k => v => setRule(r => ({ ...r, [k]: v }));

  const addAction = () => setRule(r => ({ ...r, actions: [...r.actions, { action_type: '', params: {} }] }));
  const updateAction = (i, val) => setRule(r => { const a = [...r.actions]; a[i] = val; return { ...r, actions: a }; });
  const removeAction = i => setRule(r => ({ ...r, actions: r.actions.filter((_, idx) => idx !== i) }));

  const addCondition = () => setRule(r => ({ ...r, conditions: [...(r.conditions || []), { field: '', operator: 'equals', value: '' }] }));
  const updateCondition = (i, val) => setRule(r => { const c = [...(r.conditions || [])]; c[i] = val; return { ...r, conditions: c }; });
  const removeCondition = i => setRule(r => ({ ...r, conditions: r.conditions.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    if (!rule.rule_name.trim()) return;
    if (!rule.trigger_type) return;
    onSave(rule);
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <p className="text-sm font-bold text-white">{initial?.id ? 'Edit Automation' : 'New Automation'}</p>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{ color: '#3a5a7c' }}>
          <X size={15} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Name */}
        <div>
          <label className="text-xs font-bold block mb-1.5" style={{ color: '#7ba3c8' }}>Automation Name *</label>
          <input className={inp} style={inpStyle} placeholder="e.g. Auto GBP post after new lead"
            value={rule.rule_name} onChange={e => set('rule_name')(e.target.value)} />
        </div>

        {/* Trigger */}
        <div>
          <label className="text-xs font-bold block mb-1.5" style={{ color: '#7ba3c8' }}>Trigger *</label>
          <TriggerPicker value={rule.trigger_type} onChange={set('trigger_type')} />
        </div>

        {/* Conditions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold" style={{ color: '#7ba3c8' }}>Conditions (optional)</label>
            <button type="button" onClick={addCondition}
              className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border transition"
              style={{ background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
              <Plus size={10} /> Add
            </button>
          </div>
          {(rule.conditions || []).length === 0 && (
            <p className="text-xs" style={{ color: '#3a5a7c' }}>No conditions — automation runs on every trigger</p>
          )}
          <div className="space-y-2">
            {(rule.conditions || []).map((c, i) => (
              <ConditionRow key={i} condition={c} onChange={v => updateCondition(i, v)} onRemove={() => removeCondition(i)} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold" style={{ color: '#7ba3c8' }}>Actions *</label>
            <button type="button" onClick={addAction}
              className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border transition"
              style={{ background: '#0a1020', borderColor: '#e05a1c60', color: '#e05a1c' }}>
              <Plus size={10} /> Add Action
            </button>
          </div>

          {rule.actions.length === 0 && (
            <div className="rounded-xl border border-dashed py-6 text-center" style={{ borderColor: '#1e2d45' }}>
              <p className="text-xs" style={{ color: '#3a5a7c' }}>Click "Add Action" to define what happens when this rule triggers</p>
            </div>
          )}

          {/* Flow preview */}
          {rule.actions.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {rule.trigger_type && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: '#1e2d45', color: '#c8d9eb' }}>
                  {TRIGGERS.find(t => t.key === rule.trigger_type)?.icon} Trigger
                </div>
              )}
              {rule.actions.map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <ArrowRight size={12} style={{ color: '#3a5a7c' }} />
                  <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#1e2d45', color: '#c8d9eb' }}>
                    Action {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {rule.actions.map((act, i) => (
              <ActionBlock key={i} action={act} index={i}
                onChange={v => updateAction(i, v)}
                onRemove={() => removeAction(i)} />
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving || !rule.rule_name || !rule.trigger_type}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Automation'}
          </button>
          <button onClick={onCancel}
            className="px-5 py-3 rounded-xl text-sm font-semibold transition"
            style={{ background: '#1e2d45', color: '#7ba3c8' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}