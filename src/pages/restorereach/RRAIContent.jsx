import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';

import ContentInputPanel from './content/ContentInputPanel';
import ContentOutputPanel from './content/ContentOutputPanel';
import ContentHistoryPanel from './content/ContentHistoryPanel';

export default function RRAIContent() {
  const { user, companyId, profileLoading, isReady } = useRRCompany();
  const qc = useQueryClient();

  const [inputs, setInputs] = useState({
    content_type: 'GBP Post',
    service: 'Water Damage',
    city: '',
    county: '',
    keyword: '',
    pain_point: '',
    tone: 'Professional & Authoritative',
    cta: 'Get a Free Inspection – Call 636-219-9302',
  });

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.RRMarketingCampaign.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-campaigns'] });
      toast({ title: '✅ Content saved as campaign' });
    },
  });

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const AVOID = 'trauma, compassionate, junk';
      const cityLine = [inputs.city, inputs.county].filter(Boolean).join(', ') || 'your service area';

      const prompt = `You are an expert restoration marketing copywriter specializing in local SEO and Google Business Profile content.

Generate high-converting restoration marketing content with these parameters:

Content Type: ${inputs.content_type}
Service: ${inputs.service}
Location: ${cityLine}
Target Keyword: ${inputs.keyword || inputs.service + ' ' + inputs.city}
Customer Pain Point: ${inputs.pain_point || 'property damage causing stress and financial worry'}
Brand Tone: ${inputs.tone}
Call-to-Action: "${inputs.cta}"

STRICT RULES:
- NEVER use these words: ${AVOID}
- Include the city/county name naturally at least 3 times
- Make content feel local, urgent, and trustworthy
- End every piece with the exact CTA: "${inputs.cta}"
- Optimize for local SEO with natural keyword placement

Content type guidelines:
- GBP Post: 150-300 words, action-oriented, includes CTA
- Facebook Post: 100-200 words, conversational, emoji-friendly
- Blog: 400-600 words, educational, SEO-rich with H2 subheadings in the body
- City Page: 300-500 words, location-specific SEO landing page content
- Storm Alert: 100-150 words, urgent, emergency-focused
- Mold Prevention Tips: 200-350 words, educational numbered tips
- Review Response: 80-120 words, professional, grateful, mentions service/location

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "title": "Compelling SEO title (max 70 chars)",
  "body": "Full content body (use \\n for line breaks)",
  "cta_text": "Exact CTA text",
  "hashtags": "5-8 relevant hashtags space-separated starting with #",
  "image_suggestion": "Specific image/photo recommendation",
  "meta_description": "SEO meta description 150-160 chars"
}`;

      const raw = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            cta_text: { type: 'string' },
            hashtags: { type: 'string' },
            image_suggestion: { type: 'string' },
            meta_description: { type: 'string' },
          },
        },
      });

      setResult({ ...raw, inputs: { ...inputs } });
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result || !companyId) return;
    saveMutation.mutate({
      company_id: companyId,
      campaign_name: result.title,
      campaign_type: 'seo_content',
      status: 'draft',
      target_city: inputs.city,
      target_service: inputs.service,
      content_generated: [result],
    });
  };

  const handleSchedule = () => {
    if (!result || !companyId) return;
    base44.entities.GBPPost.create({
      company_id: companyId,
      title: result.title,
      body: result.body,
      hashtags: result.hashtags,
      image_suggestion: result.image_suggestion,
      service: inputs.service,
      city: inputs.city,
      post_type: inputs.content_type,
      tone: inputs.tone,
      cta: result.cta_text,
      status: 'draft',
    }).then(() => {
      qc.invalidateQueries({ queryKey: ['gbp-posts', companyId] });
      toast({ title: '📅 Added to GBP Post Calendar' });
    });
  };

  const handleCreateCampaign = () => {
    if (!result || !companyId) return;
    saveMutation.mutate({
      company_id: companyId,
      campaign_name: result.title,
      campaign_type: 'seo_content',
      status: 'active',
      target_city: inputs.city,
      target_service: inputs.service,
      content_generated: [result],
    });
  };

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-5 md:p-7 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={22} style={{ color: '#e05a1c' }} /> AI Content Engine
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Generate local SEO content for GBP, social, blogs, city pages, and storm alerts
        </p>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Left: Inputs */}
        <div className="xl:col-span-2">
          <ContentInputPanel
            inputs={inputs}
            setInputs={setInputs}
            onGenerate={generate}
            generating={generating}
          />
        </div>

        {/* Right: Output */}
        <div className="xl:col-span-3">
          <ContentOutputPanel
            result={result}
            generating={generating}
            onSave={handleSave}
            onSchedule={handleSchedule}
            onCreateCampaign={handleCreateCampaign}
            saving={saveMutation.isPending}
          />
        </div>
      </div>

      {/* History */}
      <ContentHistoryPanel companyId={companyId} />
    </div>
    </RRAccessGate>
  );
}