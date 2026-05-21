import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Copy, CheckCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ALL_SERVICES = [
  'Water Damage', 'Fire & Smoke', 'Mold Remediation', 'Storm Damage',
  'Sewage Cleanup', 'Flood Damage', 'Wind Damage', 'Reconstruction', 'Biohazard',
];

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

function Section({ label, color, children, mono }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: color || '#7ba3c8' }}>{label}</span>
        {open ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#1e2d45' }}>
          <div className="mt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

function PageCard({ page }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <span className="text-sm font-bold text-white">{page.service}</span>
        <span className="text-xs" style={{ color: '#3a5a7c' }}>{new Date(page.generated_at).toLocaleDateString()}</span>
      </div>
      <div className="p-4 space-y-3">
        <Section label="H1 Heading" color="#3b82f6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-bold text-white">{page.h1}</p>
            <CopyBtn text={page.h1} />
          </div>
        </Section>
        <Section label="Meta Title" color="#8b5cf6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-white">{page.meta_title}</p>
            <CopyBtn text={page.meta_title} />
          </div>
        </Section>
        <Section label="Meta Description" color="#06b6d4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm leading-relaxed" style={{ color: '#c8d9eb' }}>{page.meta_description}</p>
            <CopyBtn text={page.meta_description} />
          </div>
        </Section>
        <Section label="Intro Paragraph" color="#10b981">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#c8d9eb' }}>{page.intro}</p>
            <CopyBtn text={page.intro} />
          </div>
        </Section>
        {page.faq?.length > 0 && (
          <Section label="FAQ" color="#f59e0b">
            <div className="space-y-3">
              {page.faq.map((item, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: '#0d1829' }}>
                  <p className="text-xs font-semibold text-white mb-1">{item.question}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#c8d9eb' }}>{item.answer}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
        <Section label="CTA" color="#e05a1c">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: '#e05a1c' }}>{page.cta}</p>
            <CopyBtn text={page.cta} />
          </div>
        </Section>
      </div>
    </div>
  );
}

export default function SEOPageGenerator({ area }) {
  const qc = useQueryClient();
  const [selectedServices, setSelectedServices] = useState(area?.services_offered || []);
  const [generating, setGenerating] = useState(false);
  const [newPages, setNewPages] = useState([]);

  const services = area?.services_offered?.length ? area.services_offered : ALL_SERVICES;
  const existingPages = area?.generated_pages || [];
  const allPages = [...newPages, ...existingPages];

  const toggleService = (s) => setSelectedServices(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RRServiceArea.update(area.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-areas'] }),
  });

  const generatePages = async () => {
    if (!selectedServices.length) {
      toast({ title: 'Select at least one service', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    const generated = [];

    try {
      for (const service of selectedServices) {
        const h1 = `Fast & Reliable ${service} in ${area.city}, ${area.state}`;
        const keywords = area.target_keywords?.join(', ') || `${service} ${area.city}`;
        const CTA = 'Get a Free Inspection – Call 636-219-9302';

        const prompt = `You are an expert local SEO copywriter for a restoration company.
Generate an SEO landing page for this service area:

Service: ${service}
City: ${area.city}
State: ${area.state}
${area.county ? `County: ${area.county}` : ''}
H1 (use EXACTLY): "${h1}"
CTA (use EXACTLY): "${CTA}"
Target Keywords: ${keywords}

Rules:
- NEVER use: trauma, compassionate, junk
- Mention city and state naturally 3+ times
- Local, urgent, trustworthy tone

Return ONLY valid JSON:
{
  "meta_title": "SEO meta title 55-60 chars, includes city and service",
  "meta_description": "Meta description 150-160 chars, includes CTA phone number",
  "intro": "2-paragraph intro 100-150 words total, local focus, addresses homeowner pain points",
  "faq": [
    {"question": "FAQ question 1 specific to ${service} in ${area.city}", "answer": "Answer 60-80 words"},
    {"question": "FAQ question 2 about response time or coverage", "answer": "Answer 60-80 words"},
    {"question": "FAQ question 3 about insurance or cost", "answer": "Answer 60-80 words"}
  ],
  "cta_body": "1-sentence closing call to action paragraph ending with the exact CTA"
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              meta_title: { type: 'string' },
              meta_description: { type: 'string' },
              intro: { type: 'string' },
              faq: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } } } },
              cta_body: { type: 'string' },
            },
          },
        });

        generated.push({
          service,
          h1,
          meta_title: result.meta_title,
          meta_description: result.meta_description,
          intro: result.intro,
          faq: result.faq,
          cta: CTA,
          generated_at: new Date().toISOString(),
        });
      }

      setNewPages(generated);

      // Save to area
      await updateMutation.mutateAsync({
        generated_pages: [...generated, ...existingPages],
        seo_status: 'active',
        last_content_created: new Date().toISOString(),
      });

      toast({ title: `✅ ${generated.length} SEO page${generated.length > 1 ? 's' : ''} generated!` });
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (!area) return null;

  return (
    <div className="space-y-4">
      {/* Generator control */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
          <Zap size={14} style={{ color: '#e05a1c' }} />
          <h3 className="text-sm font-semibold text-white">Generate SEO Pages for {area.city}, {area.state}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#3a5a7c' }}>Select Services to Generate</p>
            <div className="flex flex-wrap gap-1.5">
              {services.map(s => (
                <button key={s} type="button" onClick={() => toggleService(s)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border transition"
                  style={selectedServices.includes(s)
                    ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                    : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Preview of what will be generated */}
          {selectedServices.length > 0 && (
            <div className="rounded-xl border p-4 space-y-1.5" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#7ba3c8' }}>Will generate for each service:</p>
              {selectedServices.map(s => (
                <p key={s} className="text-xs" style={{ color: '#c8d9eb' }}>
                  <span style={{ color: '#10b981' }}>▸</span> Fast & Reliable <strong>{s}</strong> in {area.city}, {area.state}
                </p>
              ))}
            </div>
          )}

          <button onClick={generatePages} disabled={generating || !selectedServices.length}
            className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            {generating
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating {selectedServices.length} page{selectedServices.length > 1 ? 's' : ''}…</>
              : <><Zap size={14} /> Generate {selectedServices.length} SEO Page{selectedServices.length !== 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>

      {/* Generated pages */}
      {allPages.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Generated Pages ({allPages.length})</p>
          {allPages.map((page, i) => <PageCard key={`${page.service}-${i}`} page={page} />)}
        </div>
      )}
    </div>
  );
}