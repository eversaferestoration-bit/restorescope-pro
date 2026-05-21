import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, ChevronDown, ChevronUp, Copy, CheckCircle, Trash2, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PRIORITY_CONFIG = {
  high:   { color: '#ef4444', bg: '#ef444420', label: 'High' },
  medium: { color: '#f59e0b', bg: '#f59e0b20', label: 'Medium' },
  low:    { color: '#10b981', bg: '#10b98120', label: 'Low' },
};

const SEO_STATUS_CONFIG = {
  active:  { color: '#10b981', bg: '#10b98120', label: 'SEO Active' },
  pending: { color: '#f59e0b', bg: '#f59e0b20', label: 'Pending' },
  none:    { color: '#3a5a7c', bg: '#1e2d45',   label: 'No SEO' },
};

const CTA = 'Get a Free Inspection – Call 636-219-9302';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!' });
    }} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition shrink-0"
      style={{ background: '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
      {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
    </button>
  );
}

function SEOPageBlock({ page }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition">
        <span className="text-xs font-semibold text-white">{page.service}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>Generated</span>
          {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: '#1e2d45' }}>
          {/* H1 */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#e05a1c' }}>H1</p>
            <div className="flex items-start gap-2">
              <p className="text-sm font-bold text-white flex-1">{page.h1}</p>
              <CopyBtn text={page.h1} />
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#3b82f6' }}>Meta Title</p>
              <div className="flex items-start gap-2">
                <p className="text-xs text-white flex-1">{page.meta_title}</p>
                <CopyBtn text={page.meta_title} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8b5cf6' }}>Meta Description</p>
              <div className="flex items-start gap-2">
                <p className="text-xs flex-1" style={{ color: '#c8d9eb' }}>{page.meta_description}</p>
                <CopyBtn text={page.meta_description} />
              </div>
            </div>
          </div>

          {/* Intro */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#10b981' }}>Intro Paragraph</p>
            <div className="flex items-start gap-2">
              <p className="text-xs leading-relaxed flex-1" style={{ color: '#c8d9eb' }}>{page.intro}</p>
              <CopyBtn text={page.intro} />
            </div>
          </div>

          {/* FAQ */}
          {page.faq?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#f59e0b' }}>FAQ</p>
              <div className="space-y-3">
                {page.faq.map((item, i) => (
                  <div key={i}>
                    <p className="text-xs font-semibold text-white mb-0.5">{item.q}</p>
                    <p className="text-xs" style={{ color: '#c8d9eb' }}>{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: '#e05a1c15', borderColor: '#e05a1c50' }}>
            <p className="text-sm font-bold" style={{ color: '#e05a1c' }}>{CTA}</p>
            <CopyBtn text={CTA} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AreaCard({ area }) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const priority = PRIORITY_CONFIG[area.priority_level] || PRIORITY_CONFIG.medium;
  const seoStatus = SEO_STATUS_CONFIG[area.seo_status] || SEO_STATUS_CONFIG.none;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RRServiceArea.update(area.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-areas'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.RRServiceArea.delete(area.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-areas'] });
      toast({ title: 'Service area removed' });
    },
  });

  const generateSEO = async () => {
    const services = area.services_offered?.length ? area.services_offered : ['Water Damage'];
    setGenerating(true);
    try {
      const pages = await Promise.all(services.map(async (service) => {
        const h1 = `Fast & Reliable ${service} in ${area.city}, ${area.state}`;
        const prompt = `You are an expert local SEO copywriter for a restoration company.

Generate SEO page content for:
Service: ${service}
City: ${area.city}, ${area.state}${area.county ? `, ${area.county}` : ''}
Target Keywords: ${area.target_keywords?.join(', ') || service + ' ' + area.city}
H1 (EXACT): "${h1}"
CTA (EXACT): "Get a Free Inspection – Call 636-219-9302"

Rules:
- Naturally mention ${area.city} at least 4 times
- Include target keywords naturally
- Professional, authoritative tone
- Never use: "trauma", "compassionate", "junk"

Return ONLY valid JSON:
{
  "meta_title": "SEO meta title max 60 chars including city and service",
  "meta_description": "Compelling meta description 150-160 chars with city, service, and CTA",
  "intro": "3-4 sentence intro paragraph optimized for ${area.city} ${service}. Mention city naturally. End with urgency.",
  "faq": [
    {"q": "Specific question about ${service} in ${area.city}", "a": "Detailed answer 2-3 sentences"},
    {"q": "How quickly can you respond to ${service} in ${area.city}?", "a": "Answer with specifics"},
    {"q": "Do you work with insurance companies in ${area.city}?", "a": "Helpful answer"},
    {"q": "What areas near ${area.city} do you serve?", "a": "Answer mentioning surrounding areas"}
  ]
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              meta_title: { type: 'string' },
              meta_description: { type: 'string' },
              intro: { type: 'string' },
              faq: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } } } },
            },
          },
        });

        return {
          service,
          h1,
          meta_title: result.meta_title,
          meta_description: result.meta_description,
          intro: result.intro,
          faq: result.faq,
          cta: 'Get a Free Inspection – Call 636-219-9302',
          generated_at: new Date().toISOString(),
        };
      }));

      await updateMutation.mutateAsync({
        seo_pages: pages,
        seo_status: 'active',
        last_content_created: new Date().toISOString(),
      });

      toast({ title: `✅ Generated ${pages.length} SEO page${pages.length > 1 ? 's' : ''}` });
      setExpanded(true);
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <MapPin size={16} style={{ color: '#e05a1c' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-white">{area.city}, {area.state}</p>
            {area.county && <span className="text-xs" style={{ color: '#7ba3c8' }}>{area.county}</span>}
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: priority.bg, color: priority.color }}>
              {priority.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: seoStatus.bg, color: seoStatus.color }}>
              {seoStatus.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {area.services_offered?.slice(0, 4).map(s => (
              <span key={s} className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{s}</span>
            ))}
            {area.services_offered?.length > 4 && (
              <span className="text-xs" style={{ color: '#3a5a7c' }}>+{area.services_offered.length - 4} more</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={generateSEO} disabled={generating}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
            style={{ background: generating ? '#1e2d45' : '#e05a1c' }}>
            {generating
              ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Sparkles size={11} />}
            {generating ? 'Generating…' : area.seo_pages?.length ? 'Regenerate' : 'Generate SEO'}
          </button>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-white transition">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => deleteMutation.mutate()} className="text-slate-600 hover:text-red-400 transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* SEO pages */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#1e2d45' }}>
          {/* Keywords */}
          {area.target_keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="text-xs font-semibold mr-1" style={{ color: '#3a5a7c' }}>Keywords:</span>
              {area.target_keywords.map(k => (
                <span key={k} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>{k}</span>
              ))}
            </div>
          )}

          {area.seo_pages?.length > 0
            ? area.seo_pages.map((page, i) => <SEOPageBlock key={i} page={page} />)
            : (
              <p className="text-xs text-center py-4" style={{ color: '#3a5a7c' }}>
                No SEO pages yet — click "Generate SEO" to create content
              </p>
            )}
        </div>
      )}
    </div>
  );
}