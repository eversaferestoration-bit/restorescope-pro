import { useState } from 'react';
import { CloudLightning, Save } from 'lucide-react';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const EVENT_TYPES = [
  { value: 'flood', label: '🌊 Flood' },
  { value: 'hurricane', label: '🌀 Hurricane' },
  { value: 'tornado', label: '🌪️ Tornado' },
  { value: 'hail', label: '🌨️ Hail Storm' },
  { value: 'wind', label: '💨 High Wind' },
  { value: 'ice_storm', label: '🧊 Ice Storm' },
  { value: 'fire', label: '🔥 Fire' },
  { value: 'severe_thunderstorm', label: '⛈️ Severe Thunderstorm' },
  { value: 'other', label: '⚠️ Other' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'moderate', label: 'Moderate', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'catastrophic', label: 'Catastrophic', color: '#dc2626' },
];

function Field({ label, req, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">
        {label}{req && <span className="text-orange-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function StormEventForm({ onSave, saving }) {
  const [form, setForm] = useState({
    event_type: 'flood',
    affected_city: '',
    county: '',
    severity: 'moderate',
    event_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const handleSubmit = () => {
    if (!form.affected_city.trim()) return;
    onSave(form);
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <CloudLightning size={14} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">Log Storm Event</h2>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Event Type" req>
            <select className={inp} value={form.event_type} onChange={set('event_type')}>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Event Date">
            <input type="date" className={inp} value={form.event_date} onChange={set('event_date')} />
          </Field>

          <Field label="Affected City" req>
            <input className={inp} placeholder="Nashville" value={form.affected_city} onChange={set('affected_city')} />
          </Field>

          <Field label="County">
            <input className={inp} placeholder="Davidson County" value={form.county} onChange={set('county')} />
          </Field>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-400 mb-2 block">Severity</label>
            <div className="flex gap-2 flex-wrap">
              {SEVERITIES.map(s => {
                const active = form.severity === s.value;
                return (
                  <button key={s.value} type="button"
                    onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                    className="text-xs px-3 py-1.5 rounded-lg border font-semibold transition"
                    style={active
                      ? { background: s.color + '25', borderColor: s.color, color: s.color }
                      : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea className={inp + ' resize-none'} rows={3}
                placeholder="Damage reports, affected areas, insurance notes…"
                value={form.notes} onChange={set('notes')} />
            </Field>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={saving || !form.affected_city.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {saving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save size={13} />}
          {saving ? 'Saving & Generating Content…' : 'Save & Auto-Generate Content'}
        </button>
      </div>
    </div>
  );
}