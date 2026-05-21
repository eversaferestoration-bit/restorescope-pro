import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Plus, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const ALL_SERVICES = [
  'Water Damage', 'Fire & Smoke', 'Mold Remediation', 'Storm Damage',
  'Sewage Cleanup', 'Flood Damage', 'Wind Damage', 'Reconstruction', 'Biohazard',
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const PRIORITIES = [
  { value: 'high',   label: 'High',   color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low',    label: 'Low',    color: '#10b981' },
];

const DEFAULT = {
  city: '', state: 'MO', county: '', priority_level: 'medium',
  services_offered: [], target_keywords: [], zip_input: '',
  zip_codes: [], keyword_input: '',
};

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

export default function AddAreaForm({ companyId, onAdded }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...DEFAULT });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const toggleService = (s) => setForm(f => ({
    ...f,
    services_offered: f.services_offered.includes(s)
      ? f.services_offered.filter(x => x !== s)
      : [...f.services_offered, s],
  }));

  const addZip = () => {
    const z = form.zip_input.trim();
    if (z && !form.zip_codes.includes(z)) {
      setForm(f => ({ ...f, zip_codes: [...f.zip_codes, z], zip_input: '' }));
    }
  };

  const addKeyword = () => {
    const k = form.keyword_input.trim();
    if (k && !form.target_keywords.includes(k)) {
      setForm(f => ({ ...f, target_keywords: [...f.target_keywords, k], keyword_input: '' }));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RRServiceArea.create(data),
    onSuccess: (area) => {
      qc.invalidateQueries({ queryKey: ['rr-areas'] });
      toast({ title: `✅ ${form.city}, ${form.state} added` });
      setForm({ ...DEFAULT });
      if (onAdded) onAdded(area);
    },
  });

  const handleSave = () => {
    if (!form.city.trim()) { toast({ title: 'City is required', variant: 'destructive' }); return; }
    createMutation.mutate({
      company_id: companyId,
      city: form.city.trim(),
      state: form.state,
      county: form.county.trim() || undefined,
      priority_level: form.priority_level,
      services_offered: form.services_offered,
      target_keywords: form.target_keywords,
      zip_codes: form.zip_codes,
      seo_status: 'none',
      generated_pages: [],
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <MapPin size={14} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">Add Service Area</h2>
      </div>

      <div className="p-5 space-y-4">
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
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button key={p.value} type="button"
                  onClick={() => setForm(f => ({ ...f, priority_level: p.value }))}
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

        {/* Services */}
        <Field label="Services Offered">
          <div className="flex flex-wrap gap-1.5">
            {ALL_SERVICES.map(s => (
              <button key={s} type="button" onClick={() => toggleService(s)}
                className="text-xs px-2.5 py-1.5 rounded-lg border transition"
                style={form.services_offered.includes(s)
                  ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                  : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        {/* Keywords */}
        <Field label="Target Keywords">
          <div className="flex gap-2 mb-2">
            <input className={inp} placeholder="water damage restoration Nashville"
              value={form.keyword_input} onChange={set('keyword_input')}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())} />
            <button onClick={addKeyword} className="px-3 py-2 rounded-lg text-sm text-white hover:opacity-90 shrink-0" style={{ background: '#e05a1c' }}>
              <Plus size={14} />
            </button>
          </div>
          {form.target_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.target_keywords.map((k, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                  {k}
                  <button onClick={() => setForm(f => ({ ...f, target_keywords: f.target_keywords.filter((_, j) => j !== i) }))}>
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>

        {/* Zip Codes */}
        <Field label="Zip Codes">
          <div className="flex gap-2 mb-2">
            <input className={inp} placeholder="37201"
              value={form.zip_input} onChange={set('zip_input')}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addZip())} />
            <button onClick={addZip} className="px-3 py-2 rounded-lg text-sm text-white hover:opacity-90 shrink-0" style={{ background: '#e05a1c' }}>
              <Plus size={14} />
            </button>
          </div>
          {form.zip_codes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.zip_codes.map((z, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                  {z}
                  <button onClick={() => setForm(f => ({ ...f, zip_codes: f.zip_codes.filter((_, j) => j !== i) }))}>
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>

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