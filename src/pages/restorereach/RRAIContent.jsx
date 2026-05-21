import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FileText, Zap, Copy, CheckCircle, Globe } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const CONTENT_TYPES = [
  { value: 'seo_page', label: 'SEO Landing Page' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'social_post', label: 'Social Media Post' },
  { value: 'email', label: 'Email Campaign' },
  { value: 'ad_copy', label: 'Ad Copy' },
];

const SERVICES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Smoke Damage', 'Sewage Cleanup'];
const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

export default function RRAIContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [contentType, setContentType] = useState('seo_page');
  const [service, setService] = useState('Water Damage');
  const [city, setCity] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const companyProfile = profile?.[0];
  const companyId = companyProfile?.id || user?.email || 'default';

  const { data: campaigns = [] } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list('-created_date', 50),
  });

  const saveCampaign = useMutation({
    mutationFn: (data) => base44.entities.RRMarketingCampaign.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-campaigns'] }),
  });

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const companyName = companyProfile?.company_name || 'our company';
      const phone = companyProfile?.phone || '';
      const voice = companyProfile?.brand_voice || 'professional and empathetic';

      const prompts = {
        seo_page: `Write a full SEO landing page for a restoration company.
Company: ${companyName} | Phone: ${phone} | Service: ${service} | City: ${city || 'our service area'}
Brand voice: ${voice}
Include: H1 title, meta description, intro paragraph, service description, why choose us, FAQ section (3 questions), CTA with phone number.
Format with clear section headers. Optimize for local SEO keywords.`,

        blog_post: `Write a helpful blog post for a restoration company website.
Company: ${companyName} | Topic: ${service} tips and info | City focus: ${city || 'general'}
Brand voice: ${voice}
Include: Engaging title, intro, 4-5 main sections with headers, practical tips, CTA.
~600-800 words. SEO optimized. Conversational but professional.`,

        social_post: `Create 3 variations of social media posts about ${service} for ${companyName} targeting ${city || 'local homeowners'}.
Phone: ${phone} | Brand voice: ${voice}
Include: Facebook version (150 words), Instagram caption with hashtags, Twitter/X version (280 chars).
Make each feel native to the platform.`,

        email: `Write a marketing email campaign for ${companyName} about ${service} services.
Target: Homeowners in ${city || 'our service area'} | Phone: ${phone}
Subject line options (3), preview text, email body with personalization tokens, CTA button text.
Professional, helpful tone. Include seasonal relevance if applicable.`,

        ad_copy: `Create Google Ads copy for ${companyName} - ${service} in ${city || 'local area'}.
Phone: ${phone}
Generate: 3 responsive search ad headlines (max 30 chars each), 2 descriptions (max 90 chars each), 3 call extensions, 2 sitelink suggestions.
Focus on urgency, trust, and local service.`,
      };

      const generated = await base44.integrations.Core.InvokeLLM({ prompt: prompts[contentType] });
      setResult(generated);

      saveCampaign.mutate({
        company_id: companyId,
        campaign_name: `${CONTENT_TYPES.find(t => t.value === contentType)?.label} - ${service} - ${city || 'General'}`,
        campaign_type: contentType === 'seo_page' ? 'seo_content' : 'social',
        status: 'draft',
        target_city: city,
        target_service: service,
        content_generated: [{ type: contentType, content: generated, created_at: new Date().toISOString() }],
        posts_created: 1,
      });
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!' });
  };

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText size={22} style={{ color: '#e05a1c' }} /> AI Content Engine
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Generate SEO pages, social posts, emails, and ad copy</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 rounded-xl border p-5 space-y-4 h-fit" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Zap size={14} style={{ color: '#e05a1c' }} /> Content Settings</h2>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Content Type</label>
            <select className={inp} style={inpStyle} value={contentType} onChange={e => setContentType(e.target.value)}>
              {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Service</label>
            <select className={inp} style={inpStyle} value={service} onChange={e => setService(e.target.value)}>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Target City</label>
            <input className={inp} style={inpStyle} placeholder="Nashville, TN" value={city} onChange={e => setCity(e.target.value)} />
          </div>

          <button onClick={generate} disabled={generating}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            <Zap size={15} /> {generating ? 'Generating…' : 'Generate Content'}
          </button>

          {/* Recent campaigns */}
          {campaigns.length > 0 && (
            <div className="pt-3 border-t" style={{ borderColor: '#1e2d45' }}>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Recent ({campaigns.length})</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {campaigns.slice(0, 6).map(c => (
                  <div key={c.id} className="rounded-lg px-2.5 py-1.5" style={{ background: '#0a1020' }}>
                    <p className="text-xs text-white truncate">{c.campaign_name}</p>
                    <p className="text-xs" style={{ color: '#3a5a7c' }}>{c.target_city || 'General'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="lg:col-span-3 rounded-xl border p-5 flex flex-col" style={{ background: '#0d1829', borderColor: '#1e2d45', minHeight: 500 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe size={14} style={{ color: '#7ba3c8' }} />
              {CONTENT_TYPES.find(t => t.value === contentType)?.label}
            </h2>
            {result && (
              <button onClick={copy}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition font-medium"
                style={{ background: copied ? '#10b98133' : '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
            )}
          </div>

          {generating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm" style={{ color: '#7ba3c8' }}>AI is writing your content…</p>
                <p className="text-xs mt-1" style={{ color: '#3a5a7c' }}>This may take 10-20 seconds</p>
              </div>
            </div>
          ) : result ? (
            <div className="flex-1 rounded-lg p-4 overflow-y-auto" style={{ background: '#0a1020' }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8d9eb' }}>{result}</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText size={32} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
                <p className="text-sm" style={{ color: '#3a5a7c' }}>Select a content type and click Generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}