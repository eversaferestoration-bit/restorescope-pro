import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Copy, CheckCircle, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const SERVICES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Smoke Damage', 'Sewage Cleanup', 'Emergency Services', 'Reconstruction'];
const POST_TYPES = ['Emergency Alert', 'Before & After Story', 'Seasonal Tips', 'Service Spotlight', 'Community Update', 'Promotion/Offer', 'Storm Response', 'Educational'];
const TONES = ['Professional & Authoritative', 'Urgent & Action-Oriented', 'Friendly & Community-Focused', 'Empathetic & Reassuring'];
const CTAS = ['Call Now', 'Get a Free Estimate', 'Request Emergency Service', 'Book an Inspection', 'Contact Us Today', 'Visit Our Website'];

export default function GBPPostGenerator({ profile, companyId }) {
  const qc = useQueryClient();

  const [inputs, setInputs] = useState({
    service: 'Water Damage',
    city: '',
    post_type: 'Emergency Alert',
    tone: 'Professional & Authoritative',
    cta: 'Call Now',
  });

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  const set = (k) => (e) => setInputs(f => ({ ...f, [k]: e.target.value }));

  const savePost = useMutation({
    mutationFn: (data) => base44.entities.GBPPost.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-posts', companyId] });
      toast({ title: '✅ Post saved to calendar' });
    },
  });

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const name = profile?.company_name || 'our restoration company';
      const phone = profile?.phone || 'CALL NOW';
      const city = inputs.city || profile?.city || 'our service area';

      const prompt = `You are a Google Business Profile expert for restoration companies.
Generate a complete GBP post package.

Company: ${name}
Phone: ${phone}
Service: ${inputs.service}
Target City: ${city}
Post Type: ${inputs.post_type}
Tone: ${inputs.tone}
Call-to-Action: "${inputs.cta}"

Return ONLY valid JSON (no markdown, no code block) with this exact structure:
{
  "title": "Compelling post title (max 60 chars)",
  "body": "Post body (150-300 words, includes ${city} references, ends with ${inputs.cta} and phone ${phone})",
  "hashtags": "#WaterDamage #Restoration #${city.replace(/[^a-zA-Z]/g,'')} (5-7 relevant hashtags)",
  "image_suggestion": "Specific visual recommendation for an image to pair with this post"
}`;

      const raw = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            hashtags: { type: 'string' },
            image_suggestion: { type: 'string' },
          },
        },
      });
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
      service: inputs.service,
      city: inputs.city,
      post_type: inputs.post_type,
      tone: inputs.tone,
      cta: inputs.cta,
      status: 'draft',
    });
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
    toast({ title: 'Copied!' });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <Zap size={15} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">AI GBP Post Generator</h2>
      </div>

      <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {/* Inputs */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Service</label>
              <select className={inp} style={inpStyle} value={inputs.service} onChange={set('service')}>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">City / Area</label>
              <input className={inp} style={inpStyle} placeholder="Nashville, TN" value={inputs.city} onChange={set('city')} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Post Type</label>
              <select className={inp} style={inpStyle} value={inputs.post_type} onChange={set('post_type')}>
                {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Tone</label>
              <select className={inp} style={inpStyle} value={inputs.tone} onChange={set('tone')}>
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Call-to-Action</label>
              <select className={inp} style={inpStyle} value={inputs.cta} onChange={set('cta')}>
                {CTAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button onClick={generate} disabled={generating}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            {generating
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
              : <><Zap size={14} /> Generate GBP Post</>}
          </button>
        </div>

        {/* Output */}
        <div className="space-y-3">
          {generating && (
            <div className="rounded-xl border p-8 flex flex-col items-center justify-center text-center" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-3" />
              <p className="text-sm text-white font-semibold">AI is crafting your post…</p>
            </div>
          )}

          {result && !generating && (
            <div className="space-y-3">
              {/* Title */}
              <div className="rounded-lg border p-3" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Title</p>
                  <button onClick={() => copy(result.title, 'title')} className="text-xs flex items-center gap-1" style={{ color: copied === 'title' ? '#10b981' : '#7ba3c8' }}>
                    {copied === 'title' ? <CheckCircle size={11} /> : <Copy size={11} />} Copy
                  </button>
                </div>
                <p className="text-sm font-semibold text-white">{result.title}</p>
              </div>

              {/* Body */}
              <div className="rounded-lg border p-3" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Post Body</p>
                  <button onClick={() => copy(result.body, 'body')} className="text-xs flex items-center gap-1" style={{ color: copied === 'body' ? '#10b981' : '#7ba3c8' }}>
                    {copied === 'body' ? <CheckCircle size={11} /> : <Copy size={11} />} Copy
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8d9eb' }}>{result.body}</p>
              </div>

              {/* Hashtags */}
              <div className="rounded-lg border p-3" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Hashtags</p>
                  <button onClick={() => copy(result.hashtags, 'tags')} className="text-xs flex items-center gap-1" style={{ color: copied === 'tags' ? '#10b981' : '#7ba3c8' }}>
                    {copied === 'tags' ? <CheckCircle size={11} /> : <Copy size={11} />} Copy
                  </button>
                </div>
                <p className="text-xs" style={{ color: '#3b82f6' }}>{result.hashtags}</p>
              </div>

              {/* Image suggestion */}
              <div className="rounded-lg border p-3" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#3a5a7c' }}>📸 Image Suggestion</p>
                <p className="text-xs italic" style={{ color: '#7ba3c8' }}>{result.image_suggestion}</p>
              </div>

              {/* Save */}
              <button onClick={handleSave} disabled={savePost.isPending}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: savePost.isSuccess ? '#10b981' : '#1e2d45' }}>
                {savePost.isPending
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : savePost.isSuccess ? <CheckCircle size={14} /> : <Save size={14} />}
                {savePost.isPending ? 'Saving…' : savePost.isSuccess ? 'Saved!' : 'Save to Post Calendar'}
              </button>
            </div>
          )}

          {!result && !generating && (
            <div className="rounded-xl border p-10 flex flex-col items-center justify-center text-center" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <Zap size={28} className="mb-2" style={{ color: '#3a5a7c' }} />
              <p className="text-sm" style={{ color: '#3a5a7c' }}>Configure your post and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}