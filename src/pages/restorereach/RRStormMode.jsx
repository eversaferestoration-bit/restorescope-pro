import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { CloudLightning, Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import StormEventForm from './storm/StormEventForm';
import StormGeneratedContent from './storm/StormGeneratedContent';
import StormEventList from './storm/StormEventList';

async function generateStormContent(event) {
  const location = [event.affected_city, event.county].filter(Boolean).join(', ');
  const eventLabel = event.event_type?.replace(/_/g, ' ') || 'storm';
  const severity = event.severity || 'moderate';

  const prompt = `You are an emergency marketing expert for a restoration company.

A ${severity} ${eventLabel} has hit ${location} on ${event.event_date || 'today'}.
${event.notes ? `Additional context: ${event.notes}` : ''}

Generate emergency marketing content. Never use: "trauma", "compassionate", "junk".

Return ONLY valid JSON (no markdown):
{
  "gbp_post": "Emergency GBP post (150-250 words, urgent, local, ends with Call 636-219-9302)",
  "facebook_post": "Facebook emergency post (100-180 words, emoji-friendly, urgent)",
  "landing_page_outline": "Landing page outline with: H1 headline, 3 benefit bullets, trust signals, CTA",
  "ad_headline": ["Headline 1 (30 chars max)", "Headline 2 (30 chars max)", "Headline 3 (30 chars max)", "Headline 4 (30 chars max)"],
  "service_keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5", "keyword 6", "keyword 7", "keyword 8"]
}`;

  return base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        gbp_post: { type: 'string' },
        facebook_post: { type: 'string' },
        landing_page_outline: { type: 'string' },
        ad_headline: { type: 'array', items: { type: 'string' } },
        service_keywords: { type: 'array', items: { type: 'string' } },
      },
    },
  });
}

export default function RRStormMode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const companyId = user?.email || 'default';

  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activating, setActivating] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['storm-events'],
    queryFn: () => base44.entities.StormEvent.list('-created_date', 50),
  });

  const activeCount = events.filter(e => e.status === 'active').length;

  // Save new storm + auto-generate content
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const content = await generateStormContent(formData);
      const event = await base44.entities.StormEvent.create({
        ...formData,
        company_id: companyId,
        status: 'monitoring',
        generated_content: content,
        marketing_triggered: false,
      });
      qc.invalidateQueries({ queryKey: ['storm-events'] });
      setSelectedEvent({ ...event, generated_content: content });
      toast({ title: '⛈️ Storm event saved with generated content' });
    } catch (err) {
      toast({ title: 'Save failed', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Activate Storm Campaign
  const handleActivate = async (event) => {
    setActivating(event.id);
    try {
      const content = event.generated_content || await generateStormContent(event);

      // 1. Create marketing campaign
      const campaign = await base44.entities.RRMarketingCampaign.create({
        company_id: companyId,
        campaign_name: `Storm Response — ${event.affected_city} ${event.event_type?.replace(/_/g, ' ')}`,
        campaign_type: 'storm_alert',
        status: 'active',
        target_city: event.affected_city,
        target_service: event.event_type,
        content_generated: [content],
      });

      // 2. Create GBP post
      const gbpPost = await base44.entities.GBPPost.create({
        company_id: companyId,
        title: `Emergency ${event.event_type?.replace(/_/g, ' ')} Response — ${event.affected_city}`,
        body: content.gbp_post || '',
        service: event.event_type,
        city: event.affected_city,
        post_type: 'Storm Alert',
        status: 'scheduled',
      });

      // 3. Mark storm event as triggered + active
      await base44.entities.StormEvent.update(event.id, {
        status: 'active',
        marketing_triggered: true,
        campaign_id: campaign.id,
        gbp_post_id: gbpPost.id,
        generated_content: content,
      });

      qc.invalidateQueries({ queryKey: ['storm-events'] });
      toast({ title: `🚨 Storm campaign activated for ${event.affected_city}` });
    } catch (err) {
      toast({ title: 'Activation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="p-5 md:p-7 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CloudLightning size={22} style={{ color: '#e05a1c' }} /> Storm Mode
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
            Log storm events, auto-generate emergency content, and activate campaigns instantly
          </p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: '#ef444415', borderColor: '#ef444440' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ef4444' }} />
            <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{activeCount} Active Storm{activeCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: events.length, color: '#7ba3c8' },
          { label: 'Active', value: events.filter(e => e.status === 'active').length, color: '#ef4444' },
          { label: 'Monitoring', value: events.filter(e => e.status === 'monitoring').length, color: '#f59e0b' },
          { label: 'Campaigns Live', value: events.filter(e => e.marketing_triggered).length, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main grid: Form + Events List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StormEventForm onSave={handleSave} saving={saving} />
        <StormEventList
          events={events}
          isLoading={isLoading}
          onActivate={handleActivate}
          activating={activating}
          onSelect={(ev) => setSelectedEvent(ev)}
          selectedId={selectedEvent?.id}
        />
      </div>

      {/* Generated content viewer */}
      {selectedEvent?.generated_content && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ background: '#1e2d45' }} />
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
              Content for: {selectedEvent.affected_city}
            </span>
            <div className="h-px flex-1" style={{ background: '#1e2d45' }} />
          </div>
          <StormGeneratedContent content={selectedEvent.generated_content} />
        </div>
      )}
    </div>
  );
}