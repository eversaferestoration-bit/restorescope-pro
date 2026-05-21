import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CloudLightning, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const EVENT_TYPES = [
  { value: 'flood', label: '🌊 Flood' },
  { value: 'hurricane', label: '🌀 Hurricane' },
  { value: 'tornado', label: '🌪 Tornado' },
  { value: 'hail', label: '🧊 Hail' },
  { value: 'wind', label: '💨 High Wind' },
  { value: 'ice_storm', label: '🌨 Ice Storm' },
  { value: 'fire', label: '🔥 Fire' },
  { value: 'severe_thunderstorm', label: '⛈ Severe Thunderstorm' },
  { value: 'other', label: '⚡ Other' },
];

const SEVERITY_CONFIG = {
  low: { color: '#10b981', label: 'Low' },
  moderate: { color: '#f59e0b', label: 'Moderate' },
  high: { color: '#ef4444', label: 'High' },
  catastrophic: { color: '#dc2626', label: 'Catastrophic' },
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

export default function StormEventForm({ companyId, userEmail, onCreated }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    event_type: 'flood',
    affected_city: '',
    county: '',
    severity: 'moderate',
    event_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [generating, setGenerating] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StormEvent.create(data),
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ['storm-events'], exact: false });
      toast({ title: '⚡ Storm event created — generating content…' });
      if (onCreated) onCreated(event);
      setForm({ event_type: 'flood', affected_city: '', county: '', severity: 'moderate', event_date: new Date().toISOString().split('T')[0], notes: '' });
    },
  });

  const handleSave = async () => {
    if (!form.affected_city) {
      toast({ title: 'Affected city is required', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const eventLabel = EVENT_TYPES.find(e => e.value === form.event_type)?.label || form.event_type;
      const location = [form.affected_city, form.county].filter(Boolean).join(', ');

      const prompt = `You are an emergency restoration marketing expert. A ${eventLabel} event just occurred in ${location}.
Severity: ${SEVERITY_CONFIG[form.severity]?.label}
Event Date: ${form.event_date}
Notes: ${form.notes || 'None'}

Generate emergency restoration marketing content. Return ONLY valid JSON:
{
  "gbp_post": {
    "title": "Emergency GBP post title (max 60 chars, urgent)",
    "body": "GBP post body 150-200 words, mentions ${location}, urgent CTA, ends with Get a Free Inspection – Call 636-219-9302"
  },
  "facebook_post": {
    "body": "Facebook post 100-150 words, community-focused, mentions ${location}, includes emergency CTA"
  },
  "landing_page": {
    "headline": "Landing page H1",
    "subheadline": "Supporting line",
    "sections": ["Section 1 outline", "Section 2 outline", "Section 3 outline", "CTA section"]
  },
  "ad_headlines": ["Headline 1 (30 chars max)", "Headline 2 (30 chars max)", "Headline 3 (30 chars max)"],
  "service_keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5", "keyword 6"]
}`;

      const generated = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            gbp_post: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } } },
            facebook_post: { type: 'object', properties: { body: { type: 'string' } } },
            landing_page: {
              type: 'object',
              properties: {
                headline: { type: 'string' },
                subheadline: { type: 'string' },
                sections: { type: 'array', items: { type: 'string' } },
              },
            },
            ad_headlines: { type: 'array', items: { type: 'string' } },
            service_keywords: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      createMutation.mutate({
        ...form,
        company_id: companyId,
        status: 'monitoring',
        marketing_triggered: false,
        generated_content: generated,
      });
    } catch (err) {
      toast({ title: 'Content generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const busy = generating || createMutation.isPending;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <CloudLightning size={14} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">Log Storm Event</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Event Type */}
        <Field label="Event Type" req>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.map(et => (
              <button key={et.value} type="button"
                onClick={() => setForm(f => ({ ...f, event_type: et.value }))}
                className="text-xs px-2.5 py-2 rounded-lg border transition min-h-[36px]"
                style={form.event_type === et.value
                  ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                  : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                {et.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Affected City" req>
            <input className={inp} placeholder="Nashville" value={form.affected_city} onChange={set('affected_city')} />
          </Field>
          <Field label="County">
            <input className={inp} placeholder="Davidson County" value={form.county} onChange={set('county')} />
          </Field>
          <Field label="Event Date">
            <input type="date" className={inp} value={form.event_date} onChange={set('event_date')} />
          </Field>
          <Field label="Severity">
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => setForm(f => ({ ...f, severity: k }))}
                  className="flex-1 text-xs py-2 rounded-lg border transition font-medium min-w-[60px] min-h-[36px]"
                  style={form.severity === k
                    ? { background: v.color + '25', borderColor: v.color, color: v.color }
                    : { background: '#0a1020', borderColor: '#1e2d45', color: '#3a5a7c' }}>
                  {v.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Notes">
          <textarea className={inp + ' resize-none'} rows={2} placeholder="Additional details about the event…" value={form.notes} onChange={set('notes')} />
        </Field>

        <button onClick={handleSave} disabled={busy}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {busy
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {generating ? 'Generating content…' : 'Saving…'}</>
            : <><Save size={13} /> Save & Generate Content</>}
        </button>
      </div>
    </div>
  );
}