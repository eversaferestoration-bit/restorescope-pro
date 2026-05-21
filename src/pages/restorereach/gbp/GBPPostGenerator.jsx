import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Copy, CheckCircle, Save, Image } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const SERVICES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Smoke Damage', 'Sewage Cleanup', 'Reconstruction'];
const POST_TYPES = ['Service Announcement', 'Emergency Alert', 'Before & After Story', 'Seasonal Tips', 'Community Spotlight', 'Offer/Promotion', 'Educational'];
const TONES = ['Professional', 'Urgent', 'Empathetic', 'Authoritative', 'Friendly'];
const CTAS = ['Call Now', 'Get a Free Estimate', 'Visit Our Website', 'Book Online', 'Call for 24/7 Emergency'];

export default function GBPPostGenerator({ profile, companyId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ service: 'Water Damage', city: '', post_type: 'Service Announcement', tone: 'Professional', cta: 'Call Now' });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  const savePost = useMutation({
    mutationFn: (data) => base44.entities.GBPPost.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-posts'] });
      qc.invalidateQueries({ queryKey: ['rr-campaigns'] });
      toast({ title: 'Post saved to calendar' });
    },
  });

  const saveCampaign = useMutation({
    mutationFn: (data) => base44.entities.RRMarketingCampaign.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-campaigns'] }),
  });

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    const name = profile?.company_name || 'our restoration company';
    const phone = profile?.phone || 'call us';

    const prompt = `You are a Google Business Profile expert for restoration companies. Generate a GBP post in JSON format.

Company: ${name} | Phone: ${phone}
Service: ${form.service} | City: ${form.city || 'local area'} | Post Type: ${form.post_type} | Tone: ${form.tone} | CTA: ${form.cta}

Return ONLY valid JSON (no markdown, no code blocks) with exactly these fields:
{
  "title": "catchy title under 10 words",
  "body": "150-250 word post body with local focus, urgency if appropriate, and the CTA '${form.cta}'. End with phone: ${phone}",
  "hashtags": ["tag1","tag2","tag3","tag4","tag5"],
  "image_suggestion": "one sentence describing the ideal photo to pair with this post"
}`;

    try {
      const raw = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          image_suggestion: { type: 'string' },
        }
      }});
      setResult(raw);
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    savePost.mutate({
      company_id: companyId,
      title: result.title,
      body: result.body,
      hashtags: result.hashtags,
      image_suggestion: result.image_suggestion,
      service: form.service,
      city: form.city,
      post_type: form.post_type,
      tone: form.tone,
      cta: form.cta,
      status: 'draft',
    });
    saveCampaign.mutate({
      company_id: companyId,
      campaign_name: `GBP - ${form.service} - ${form.city || 'General'}`,
      campaign_type: 'gbp_post',
      status: 'draft',
      target_city: form.city,
      target_service: form.service,
      content_generated: [{ type: 'gbp_post', ...result, created_at: new Date().toISOString() }],
      posts_created: 1,
    });
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
    toast({ title: 'Copied!' });
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Zap size={15} style={{ color: '#e05a1c' }} /> AI GBP Post Generator
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Service</label>
          <select className={inp} style={inpStyle} value={form.service} onChange={set('service')}>
            {SERVICES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">City</label>
          <input className={inp} style={inpStyle} placeholder="Nashville, TN" value={form.city} onChange={set('city')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Post Type</label>
          <select className={inp} style={inpStyle} value={form.post_type} onChange={set('post_type')}>
            {POST_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Tone</label>
          <select className={inp} style={inpStyle} value={form.tone} onChange={set('tone')}>
            {TONES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Call-to-Action</label>
          <select className={inp} style={inpStyle} value={form.cta} onChange={set('cta')}>
            {CTAS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={generate} disabled={generating}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            <Zap size={14} /> {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {generating && (
        <div className="rounded-lg p-6 text-center" style={{ background: '#0a1020' }}>
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm" style={{ color: '#7ba3c8' }}>AI is crafting your post…</p>
        </div>
      )}

      {result && !generating && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: '#0a1020' }}>
          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#3a5a7c' }}>Title</p>
              <p className="text-base font-bold text-white">{result.title}</p>
            </div>
            <button onClick={() => copy(result.title, 'title')} className="shrink-0 text-xs px-2 py-1 rounded-lg transition" style={{ background: copied === 'title' ? '#10b98133' : '#1e2d45', color: copied === 'title' ? '#10b981' : '#7ba3c8' }}>
              {copied === 'title' ? <CheckCircle size={11} /> : <Copy size={11} />}
            </button>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#3a5a7c' }}>Post Body</p>
              <button onClick={() => copy(result.body, 'body')} className="text-xs px-2 py-1 rounded-lg transition flex items-center gap-1" style={{ background: copied === 'body' ? '#10b98133' : '#1e2d45', color: copied === 'body' ? '#10b981' : '#7ba3c8' }}>
                {copied === 'body' ? <CheckCircle size={11} /> : <Copy size={11} />} Copy
              </button>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8d9eb' }}>{result.body}</p>
          </div>

          {/* Hashtags */}
          {result.hashtags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#3a5a7c' }}>Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map(h => (
                  <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e3a5f', color: '#3b82f6' }}>#{h.replace(/^#/, '')}</span>
                ))}
              </div>
            </div>
          )}

          {/* Image suggestion */}
          {result.image_suggestion && (
            <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: '#0d1829' }}>
              <Image size={14} className="shrink-0 mt-0.5" style={{ color: '#8b5cf6' }} />
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#8b5cf6' }}>Image Suggestion</p>
                <p className="text-xs" style={{ color: '#7ba3c8' }}>{result.image_suggestion}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={savePost.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition"
              style={{ background: '#e05a1c' }}>
              <Save size={13} /> {savePost.isPending ? 'Saving…' : 'Save to Calendar'}
            </button>
            <button onClick={() => copy(`${result.title}\n\n${result.body}\n\n${result.hashtags?.map(h => '#'+h.replace(/^#/,'')).join(' ')}`, 'all')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition"
              style={{ background: '#1e2d45', color: '#7ba3c8' }}>
              <Copy size={13} /> Copy All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}