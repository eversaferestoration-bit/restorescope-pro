import { Link } from 'react-router-dom';
import { Zap, Building2, Star, MapPin, FileText, CloudLightning, Phone, CheckCircle } from 'lucide-react';

function buildRecommendations({ companyProfile, areas, campaigns, leads, visScore }) {
  const recs = [];

  if (!companyProfile?.company_name) {
    recs.push({
      priority: 'high',
      icon: Building2,
      color: '#ef4444',
      title: 'Complete your company profile',
      desc: 'Add your business details to unlock all RestoreReach AI features.',
      path: '/restorereach/settings',
      cta: 'Complete Profile',
    });
  }

  if (!companyProfile?.google_business_profile_url) {
    recs.push({
      priority: 'high',
      icon: Building2,
      color: '#3b82f6',
      title: 'Link your Google Business Profile',
      desc: 'Connect your GBP to generate optimized posts and track visibility.',
      path: '/restorereach/settings',
      cta: 'Link GBP',
    });
  }

  if (!companyProfile?.google_review_link) {
    recs.push({
      priority: 'high',
      icon: Star,
      color: '#f59e0b',
      title: 'Set up your review request link',
      desc: 'Add your Google review link to start automating review requests.',
      path: '/restorereach/settings',
      cta: 'Add Review Link',
    });
  }

  const gbpPosts = campaigns.filter(c => c.campaign_type === 'gbp_post').length;
  if (gbpPosts < 5) {
    recs.push({
      priority: gbpPosts === 0 ? 'high' : 'medium',
      icon: Building2,
      color: '#3b82f6',
      title: gbpPosts === 0 ? 'Create your first GBP post' : `Create more GBP posts (${gbpPosts}/5 done)`,
      desc: 'Regular GBP posts boost local search rankings and customer trust.',
      path: '/restorereach/gbp',
      cta: 'Create Post',
    });
  }

  if (areas.length < 3) {
    recs.push({
      priority: 'medium',
      icon: MapPin,
      color: '#8b5cf6',
      title: areas.length === 0 ? 'Add your first service area' : `Add more service areas (${areas.length}/3 min)`,
      desc: 'Define service areas to generate local SEO content for each city.',
      path: '/restorereach/areas',
      cta: 'Add Area',
    });
  }

  const seoContent = campaigns.filter(c => c.campaign_type === 'seo_content').length;
  if (seoContent === 0) {
    recs.push({
      priority: 'medium',
      icon: FileText,
      color: '#10b981',
      title: 'Generate your first SEO content page',
      desc: 'AI-written city + service landing pages to rank in local searches.',
      path: '/restorereach/content',
      cta: 'Generate Content',
    });
  }

  const reviewCampaigns = campaigns.filter(c => c.campaign_type === 'review_request').length;
  if (reviewCampaigns === 0 && leads.length > 0) {
    recs.push({
      priority: 'medium',
      icon: Star,
      color: '#f59e0b',
      title: 'Send your first review request',
      desc: `You have ${leads.length} leads — follow up with satisfied customers for reviews.`,
      path: '/restorereach/reviews',
      cta: 'Request Reviews',
    });
  }

  const stormCampaigns = campaigns.filter(c => c.campaign_type === 'storm_alert').length;
  if (stormCampaigns === 0) {
    recs.push({
      priority: 'low',
      icon: CloudLightning,
      color: '#e05a1c',
      title: 'Prepare a storm response campaign',
      desc: 'Be ready to deploy instant multi-channel marketing when storms hit.',
      path: '/restorereach/storm',
      cta: 'Prepare Storm Pack',
    });
  }

  if (leads.length === 0) {
    recs.push({
      priority: 'high',
      icon: Phone,
      color: '#e05a1c',
      title: 'Capture your first lead',
      desc: 'Start tracking inbound calls and inquiries with the lead capture form.',
      path: '/restorereach/leads',
      cta: 'Capture Lead',
    });
  }

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]).slice(0, 6);
}

const PRIORITY_BADGE = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-orange-500/20 text-orange-400',
  low: 'bg-slate-500/20 text-slate-400',
};

export default function DashRecommendedActions({ companyProfile, areas, campaigns, leads, visScore }) {
  const recs = buildRecommendations({ companyProfile, areas, campaigns, leads, visScore });

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <Zap size={15} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">Recommended Actions</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{recs.length}</span>
      </div>

      {recs.length === 0 ? (
        <div className="py-14 text-center">
          <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
          <p className="text-sm text-white font-medium">All caught up!</p>
          <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Your RestoreReach AI setup looks great.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: '#1e2d45' }}>
          {recs.map((rec, i) => {
            const Icon = rec.icon;
            return (
              <div key={i} className="flex items-start gap-3 px-5 py-4 hover:bg-white/3 transition-colors" style={{ borderColor: '#1e2d45' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: rec.color + '22' }}>
                  <Icon size={14} style={{ color: rec.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-white">{rec.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[rec.priority]}`}>{rec.priority}</span>
                  </div>
                  <p className="text-xs" style={{ color: '#7ba3c8' }}>{rec.desc}</p>
                </div>
                <Link to={rec.path}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold text-white hover:opacity-90 transition whitespace-nowrap"
                  style={{ background: rec.color }}>
                  {rec.cta}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}