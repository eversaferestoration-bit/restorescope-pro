import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const SERVICES = [
  'Water Damage', 'Fire & Smoke', 'Mold Remediation', 'Storm Damage',
  'Sewage Cleanup', 'Flood Damage', 'Wind Damage', 'Reconstruction',
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const PRIORITY = [
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low', label: 'Low', color: '#10b981' },
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

export default function AddAreaForm({ companyId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    city: '', state: 'MO', county: '', priority_level: 'medium',
    services_offered: [], target_keywords: [],
  });
  const [keywordInput, setKeywordInput] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const toggleService = (s) => setForm(f => ({
    ...f,
    services_offered: f.services_offered.includes(s)
      ? f.services_offered.filter(x => x !== s)
      : [...f.services_offered, s],
  }));

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || form.target_keywords.includes(kw)) return;
    setForm(f => ({ ...f, target_keywords: [...f.target_keywords, kw] }));
    setKeywordInput('');
  };

  const removeKeyword = (kw) => setForm(f => ({ ...f, target_keywords: f.target_keywords.filter(k => k !== kw) }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RRServiceArea.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-areas'], exact: false });
      toast({ title: '✅ Service area added' });
      if (onClose) onClose();
    },
  });

  const handleSave = () => {
    if (!form.city.trim()) {
      toast({ title: 'City is required', variant: 'destructive' });
      return;
    }
    createMutation.mutate({ ...form, company_id: companyId, seo_status: 'none', seo_pages: [] });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Plus size={14} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">Add Service Area</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition"><X size={14} /></button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Location */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Location</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" req>
              <input className={inp} placeholder="Nashville" value={form.city} onChange={set('city')} />
            </Field>
            <Field label="State">
              <select className={inp} value={form.state} onChange={set('state')}>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="County">
              <input className={inp} placeholder="Davidson County" value={form.county} onChange={set('county')} />
            </Field>
            <Field label="Priority">
              <div className="flex gap-2">
                {PRIORITY.map(p => (
                  <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, priority_level: p.value }))}
                    className="flex-1 text-xs py-2 rounded-lg border transition font-medium"
                    style={form.priority_level === p.value
                      ? { background: p.color + '25', borderColor: p.color, color: p.color }
                      : { background: '#0a1020', borderColor: '#1e2d45', color: '#3a5a7c' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        {/* Services */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Services Offered</p>
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map(s => (
              <button key={s} type="button" onClick={() => toggleService(s)}
                className="text-xs px-2.5 py-1.5 rounded-lg border transition"
                style={form.services_offered.includes(s)
                  ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                  : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Target Keywords</p>
          <div className="flex gap-2">
            <input className={inp} placeholder="water damage Nashville TN"
              value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()} />
            <button onClick={addKeyword} className="px-3 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
              style={{ background: '#e05a1c' }}>
              Add
            </button>
          </div>
          {form.target_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.target_keywords.map(kw => (
                <span key={kw} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: '#1e2d45', color: '#c8d9eb' }}>
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="hover:text-red-400 transition"><X size={9} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={createMutation.isPending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {createMutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Plus size={14} />}
          Add Service Area
        </button>
      </div>
    </div>
  );
}