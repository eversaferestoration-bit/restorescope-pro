import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Megaphone, ChevronDown, ChevronUp, Copy, CheckCircle, Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STATUS_CONFIG = {
  monitoring: { label: 'Monitoring', color: '#f59e0b', bg: '#f59e0b20', dot: '#f59e0b' },
  active:     { label: 'Active',     color: '#ef4444', bg: '#ef444420', dot: '#ef4444' },
  paused:     { label: 'Paused',     color: '#3a5a7c', bg: '#1e2d45',   dot: '#3a5a7c' },
};

const SEVERITY_COLORS = {
  low: '#10b981', moderate: '#f59e0b', high: '#ef4444', catastrophic: '#dc2626',
};

const EVENT_ICONS = {
  flood: '🌊', hurricane: '🌀', tornado: '🌪', hail: '🧊', wind: '💨',
  ice_storm: '🌨', fire: '🔥', severe_thunderstorm: '⛈', other: '⚡',
};

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!' });
    }} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
      style={{ background: '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
      {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
    </button>
  );
}

function ContentSection({ label, color, children }) {
  return (
    <div className="rounded-xl border p-4 space-y-2" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: color || '#3a5a7c' }}>{label}</p>
      {children}
    </div>
  );
}

export default function StormEventCard({ event }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [activating, setActivating] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.StormEvent.update(event.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storm-events'], exact: false }),
  });

  const handleStatusChange = (status) => {
    updateMutation.mutate({ status });
  };

  const handleActivate = async () => {
    if (event.marketing_triggered) {
      toast({ title: 'Campaign already activated for this event' });
      return;
    }
    setActivating(true);
    try {
      const gc = event.generated_content || {};
      const location = [event.affected_city, event.county].filter(Boolean).join(', ');

      // 1. Create campaign
      const campaign = await base44.entities.RRMarketingCampaign.create({
        company_id: event.company_id,
        campaign_name: `Storm Response – ${location}`,
        campaign_type: 'storm_alert',
        status: 'active',
        target_city: event.affected_city,
        target_service: event.event_type,
        content_generated: [gc],
        start_date: event.event_date,
      });

      // 2. Create GBP post
      let gbpPostId = null;
      if (gc.gbp_post) {
        const post = await base44.entities.GBPPost.create({
          company_id: event.company_id,
          title: gc.gbp_post.title,
          body: gc.gbp_post.body,
          service: event.event_type,
          city: event.affected_city,
          post_type: 'Storm Alert',
          status: 'draft',
        });
        gbpPostId = post.id;
      }

      // 3. Mark storm triggered
      await base44.entities.StormEvent.update(event.id, {
        status: 'active',
        marketing_triggered: true,
        campaign_id: campaign.id,
        gbp_post_id: gbpPostId,
      });

      qc.invalidateQueries({ queryKey: ['storm-events'], exact: false });
      qc.invalidateQueries({ queryKey: ['rr-campaigns'], exact: false });
      qc.invalidateQueries({ queryKey: ['gbp-posts'], exact: false });
      toast({ title: '🚨 Storm Campaign Activated!', description: 'Campaign created, GBP post saved, storm triggered.' });
    } catch (err) {
      toast({ title: 'Activation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setActivating(false);
    }
  };

  const status = STATUS_CONFIG[event.status] || STATUS_CONFIG.monitoring;
  const gc = event.generated_content;
  const severityColor = SEVERITY_COLORS[event.severity] || '#f59e0b';
  const icon = EVENT_ICONS[event.event_type] || '⚡';
  const location = [event.affected_city, event.county].filter(Boolean).join(', ');

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: event.status === 'active' ? '#ef444460' : '#1e2d45' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-white capitalize">{event.event_type?.replace(/_/g, ' ')}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: status.bg, color: status.color }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: status.dot }} />
              {status.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: severityColor + '20', color: severityColor }}>
              {event.severity}
            </span>
            {event.marketing_triggered && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>
                🚨 Campaign Active
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: '#7ba3c8' }}>📍 {location} · {event.event_date}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status switcher */}
          <div className="flex gap-1">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => handleStatusChange(k)}
                className="text-xs px-2 py-1 rounded-lg border transition"
                style={event.status === k
                  ? { background: v.bg, borderColor: v.color, color: v.color }
                  : { background: '#0a1020', borderColor: '#1e2d45', color: '#3a5a7c' }}>
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-white transition">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Activate button */}
      {!event.marketing_triggered && (
        <div className="px-5 pb-4">
          <button onClick={handleActivate} disabled={activating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
            style={{ background: '#dc2626' }}>
            {activating
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Megaphone size={14} />}
            {activating ? 'Activating…' : 'Activate Storm Campaign'}
          </button>
        </div>
      )}

      {/* Generated content */}
      {expanded && gc && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: '#1e2d45' }}>
          {/* GBP Post */}
          {gc.gbp_post && (
            <ContentSection label="Emergency GBP Post" color="#3b82f6">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-white">{gc.gbp_post.title}</p>
                <CopyBtn text={gc.gbp_post.title + '\n\n' + gc.gbp_post.body} />
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#c8d9eb' }}>{gc.gbp_post.body}</p>
            </ContentSection>
          )}

          {/* Facebook Post */}
          {gc.facebook_post && (
            <ContentSection label="Facebook Post" color="#6366f1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs leading-relaxed whitespace-pre-wrap flex-1" style={{ color: '#c8d9eb' }}>{gc.facebook_post.body}</p>
                <CopyBtn text={gc.facebook_post.body} />
              </div>
            </ContentSection>
          )}

          {/* Landing Page Outline */}
          {gc.landing_page && (
            <ContentSection label="Emergency Landing Page Outline" color="#8b5cf6">
              <p className="text-sm font-bold text-white">{gc.landing_page.headline}</p>
              <p className="text-xs italic" style={{ color: '#7ba3c8' }}>{gc.landing_page.subheadline}</p>
              <ul className="space-y-1 mt-1">
                {gc.landing_page.sections?.map((s, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#c8d9eb' }}>
                    <span style={{ color: '#8b5cf6' }}>▸</span> {s}
                  </li>
                ))}
              </ul>
            </ContentSection>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ad Headlines */}
            {gc.ad_headlines?.length > 0 && (
              <ContentSection label="Ad Headlines" color="#e05a1c">
                <div className="space-y-1.5">
                  {gc.ad_headlines.map((h, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-white">{h}</p>
                      <CopyBtn text={h} />
                    </div>
                  ))}
                </div>
              </ContentSection>
            )}

            {/* Keywords */}
            {gc.service_keywords?.length > 0 && (
              <ContentSection label="Service Keywords" color="#10b981">
                <div className="flex flex-wrap gap-1.5">
                  {gc.service_keywords.map((k, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#10b98120', color: '#10b981' }}>{k}</span>
                  ))}
                </div>
              </ContentSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
}