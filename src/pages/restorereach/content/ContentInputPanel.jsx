import { Zap } from 'lucide-react';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const CONTENT_TYPES = [
  'GBP Post', 'Facebook Post', 'Blog', 'City Page',
  'Storm Alert', 'Mold Prevention Tips', 'Review Response',
];

const SERVICES = [
  'Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage',
  'Smoke Damage', 'Sewage Cleanup', 'Emergency Services', 'Reconstruction',
];

const TONES = [
  'Professional & Authoritative',
  'Urgent & Action-Oriented',
  'Friendly & Community-Focused',
  'Empathetic & Reassuring',
  'Educational & Informative',
];

const TYPE_COLORS = {
  'GBP Post': '#3b82f6',
  'Facebook Post': '#6366f1',
  'Blog': '#10b981',
  'City Page': '#8b5cf6',
  'Storm Alert': '#ef4444',
  'Mold Prevention Tips': '#06b6d4',
  'Review Response': '#f59e0b',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export default function ContentInputPanel({ inputs, setInputs, onGenerate, generating }) {
  const set = (k) => (e) => setInputs(f => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <div className="rounded-xl border overflow-hidden sticky top-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <Zap size={14} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">Content Settings</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Content Type Pills */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">Content Type</label>
          <div className="flex flex-wrap gap-1.5">
            {CONTENT_TYPES.map(t => {
              const active = inputs.content_type === t;
              const color = TYPE_COLORS[t] || '#e05a1c';
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInputs(f => ({ ...f, content_type: t }))}
                  className="text-xs px-2.5 py-1.5 rounded-lg border transition font-medium"
                  style={active
                    ? { background: color + '25', borderColor: color, color }
                    : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Service">
            <select className={inp} value={inputs.service} onChange={set('service')}>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="City">
            <input className={inp} placeholder="Nashville" value={inputs.city} onChange={set('city')} />
          </Field>

          <Field label="County">
            <input className={inp} placeholder="Davidson County" value={inputs.county} onChange={set('county')} />
          </Field>

          <Field label="Target Keyword">
            <input className={inp} placeholder="water damage repair" value={inputs.keyword} onChange={set('keyword')} />
          </Field>
        </div>

        <Field label="Customer Pain Point">
          <input className={inp} placeholder="flooded basement, insurance won't pay..." value={inputs.pain_point} onChange={set('pain_point')} />
        </Field>

        <Field label="Tone">
          <select className={inp} value={inputs.tone} onChange={set('tone')}>
            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Call-to-Action">
          <input className={inp} value={inputs.cta} onChange={set('cta')} />
        </Field>

        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {generating
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
            : <><Zap size={14} /> Generate Content</>}
        </button>

        {/* Avoid words notice */}
        <p className="text-xs text-center" style={{ color: '#3a5a7c' }}>
          AI avoids: <em>trauma, compassionate, junk</em>
        </p>
      </div>
    </div>
  );
}