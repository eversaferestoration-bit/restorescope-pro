import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, X } from 'lucide-react';

const inp = 'w-full px-3 py-2.5 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45' };

const SERVICES = ['Water Damage', 'Fire & Smoke', 'Mold Remediation', 'Storm Damage', 'Sewage Cleanup', 'Biohazard', 'Flood Damage', 'Structural Drying'];
const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'unknown', label: 'Unknown' },
];

const BLANK = {
  competitor_name: '', city: '', website: '',
  google_review_count: '', google_rating: '',
  estimated_post_frequency: 'unknown',
  service_categories: [], visibility_score: '',
  strengths: [], weaknesses: [], notes: '',
};

function TagInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div>
      <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>{label}</label>
      <div className="flex gap-2 mb-2">
        <input className={inp} style={inpStyle} placeholder={placeholder}
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button type="button" onClick={add}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0"
          style={{ background: '#1e2d45' }}>Add</button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
              style={{ background: '#1e2d45', color: '#c8d9eb' }}>
              {v}
              <button onClick={() => onChange(values.filter((_, j) => j !== i))}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddCompetitorForm({ companyId, onClose, onCreated }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...BLANK });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const toggleService = s => setForm(f => ({
    ...f,
    service_categories: f.service_categories.includes(s)
      ? f.service_categories.filter(x => x !== s)
      : [...f.service_categories, s],
  }));

  const mutation = useMutation({
    mutationFn: data => base44.entities.Competitor.create(data),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['competitors'], exact: false });
      toast({ title: `✅ ${c.competitor_name} added` });
      if (onCreated) onCreated(c);
      if (onClose) onClose();
    },
  });

  const handleSubmit = () => {
    if (!form.competitor_name) {
      toast({ title: 'Competitor name is required', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      ...form,
      company_id: companyId,
      google_review_count: form.google_review_count ? parseInt(form.google_review_count) : 0,
      google_rating: form.google_rating ? parseFloat(form.google_rating) : null,
      visibility_score: form.visibility_score ? parseInt(form.visibility_score) : 0,
    });
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <PlusCircle size={14} style={{ color: '#e05a1c' }} />
          <span className="text-sm font-semibold text-white">Add Competitor</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition"><X size={16} /></button>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Competitor Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input className={inp} style={inpStyle} placeholder="ABC Restoration" value={form.competitor_name} onChange={set('competitor_name')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>City</label>
            <input className={inp} style={inpStyle} placeholder="Nashville" value={form.city} onChange={set('city')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Website</label>
            <input className={inp} style={inpStyle} placeholder="https://example.com" value={form.website} onChange={set('website')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Visibility Score (0–100)</label>
            <input type="number" min={0} max={100} className={inp} style={inpStyle} placeholder="45" value={form.visibility_score} onChange={set('visibility_score')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Google Review Count</label>
            <input type="number" min={0} className={inp} style={inpStyle} placeholder="120" value={form.google_review_count} onChange={set('google_review_count')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Google Rating (0–5)</label>
            <input type="number" min={0} max={5} step={0.1} className={inp} style={inpStyle} placeholder="4.5" value={form.google_rating} onChange={set('google_rating')} />
          </div>
        </div>

        {/* Post frequency */}
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Estimated GBP Post Frequency</label>
          <div className="flex flex-wrap gap-1.5">
            {FREQUENCIES.map(f => (
              <button key={f.value} type="button" onClick={() => setForm(prev => ({ ...prev, estimated_post_frequency: f.value }))}
                className="text-xs px-3 py-1.5 rounded-xl border transition font-medium"
                style={form.estimated_post_frequency === f.value
                  ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                  : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services */}
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Service Categories</label>
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map(s => (
              <button key={s} type="button" onClick={() => toggleService(s)}
                className="text-xs px-2.5 py-1.5 rounded-xl border transition"
                style={form.service_categories.includes(s)
                  ? { background: '#3b82f620', borderColor: '#3b82f6', color: '#3b82f6' }
                  : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <TagInput label="Strengths" values={form.strengths} onChange={v => setForm(f => ({ ...f, strengths: v }))} placeholder="e.g. High review count" />
        <TagInput label="Weaknesses" values={form.weaknesses} onChange={v => setForm(f => ({ ...f, weaknesses: v }))} placeholder="e.g. No local pages" />

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Notes</label>
          <textarea className={inp + ' resize-none'} style={inpStyle} rows={2} placeholder="Additional observations…" value={form.notes} onChange={set('notes')} />
        </div>

        <button onClick={handleSubmit} disabled={mutation.isPending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {mutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <PlusCircle size={14} />}
          {mutation.isPending ? 'Saving…' : 'Add Competitor'}
        </button>
      </div>
    </div>
  );
}