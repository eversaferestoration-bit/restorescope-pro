import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import {
  Phone, Star, MapPin, TrendingUp, CloudLightning, Zap,
  Building2, FileText, AlertCircle, CheckCircle, Radio,
  ArrowRight, RefreshCw, Eye, Edit2, Activity
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import DashMetricCards from '@/pages/restorereach/components/DashMetricCards';
import DashLeadPipeline from '@/pages/restorereach/components/DashLeadPipeline';
import DashMarketingActivity from '@/pages/restorereach/components/DashMarketingActivity';
import DashVisibilityBreakdown from '@/pages/restorereach/components/DashVisibilityBreakdown';
import DashRecommendedActions from '@/pages/restorereach/components/DashRecommendedActions';
import DashStormStatus from '@/pages/restorereach/components/DashStormStatus';

export default function RRDashboard() {
  const { user, profile: companyProfile, companyId, profileLoading, isReady } = useRRCompany();

  // All queries scoped to authenticated companyId — prevents cross-company data leakage
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['emergency-leads', companyId],
    queryFn: () => base44.entities.EmergencyLead.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas', companyId],
    queryFn: () => base44.entities.RRServiceArea.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['rr-campaigns', companyId],
    queryFn: () => base44.entities.RRMarketingCampaign.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  const { data: gbpPostsData = [] } = useQuery({
    queryKey: ['gbp-posts', companyId],
    queryFn: () => base44.entities.GBPPost.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });

  const { data: reviewsData = [] } = useQuery({
    queryKey: ['review-requests', companyId],
    queryFn: () => base44.entities.ReviewRequest.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });

  // Derived metrics — all from correct entities
  const now = new Date();
  const monthStart = startOfMonth(now);
  const totalLeads = leads.length;
  const newLeadsMonth = leads.filter(l => new Date(l.created_date || 0) >= monthStart).length;
  const gbpPosts = gbpPostsData.length;
  const reviewRequests = reviewsData.length;
  const activeAreas = areas.length;

  // Visibility score using same weighted formula as RRVisibilityScore page
  const reviewCount = reviewsData.filter(r => r.status === 'reviewed').length;
  const seoPagesCount = areas.reduce((sum, a) => sum + (a.seo_pages?.length || 0), 0);
  const gbpScore = Math.round(([
    companyProfile?.company_name, companyProfile?.phone, companyProfile?.website,
    companyProfile?.google_business_profile_url, companyProfile?.google_review_link,
    companyProfile?.address, companyProfile?.city, companyProfile?.state,
    companyProfile?.primary_services?.length > 0,
    companyProfile?.facebook_url || companyProfile?.instagram_url,
  ].filter(Boolean).length / 10) * 20);
  const reviewScore = Math.min(20, reviewCount >= 20 ? 20 : reviewCount >= 10 ? 16 : reviewCount >= 5 ? 12 : reviewCount >= 1 ? 6 : 0);
  const postScore = Math.min(15, gbpPosts >= 20 ? 15 : gbpPosts >= 10 ? 12 : gbpPosts >= 5 ? 9 : gbpPosts >= 1 ? 4 : 0);
  const contentScore = Math.min(20, (seoPagesCount >= 10 ? 12 : seoPagesCount >= 5 ? 8 : seoPagesCount >= 1 ? 4 : 0) + (areas.length >= 5 ? 8 : areas.length >= 3 ? 5 : areas.length >= 1 ? 2 : 0));
  const citationScore = (!!(companyProfile?.company_name && companyProfile?.phone && companyProfile?.address) ? 6 : 0) + (!!(companyProfile?.facebook_url && companyProfile?.instagram_url) ? 4 : 0);
  const photoScore = (companyProfile?.logo_url ? 5 : 0) + Math.min(10, leads.filter(l => l.photos?.length > 0).length >= 5 ? 10 : leads.filter(l => l.photos?.length > 0).length >= 3 ? 7 : leads.filter(l => l.photos?.length > 0).length >= 1 ? 3 : 0);
  const visScore = gbpScore + reviewScore + postScore + contentScore + citationScore + photoScore;

  // Storm mode status
  const stormEvents = campaigns.filter(c => c.campaign_type === 'storm_alert');
  const recentStorm = stormEvents.find(c => {
    const age = now - new Date(c.created_date || 0);
    return c.status === 'active' && age < 48 * 3600 * 1000;
  });
  const stormStatus = recentStorm ? 'active' : stormEvents.length > 0 ? 'monitoring' : 'inactive';

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-4 md:p-7 max-w-7xl mx-auto space-y-5 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e05a1c' }}>
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white">RestoreReach AI</h1>
          </div>
          <p className="text-xs md:text-sm ml-11" style={{ color: '#7ba3c8' }}>Local marketing command center</p>
        </div>
        <Link to="/restorereach/leads"
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold text-white hover:opacity-90 transition shrink-0 min-h-[44px]"
          style={{ background: '#e05a1c' }}>
          <Phone size={14} /> <span className="hidden sm:inline">Capture Lead</span><span className="sm:hidden">+ Lead</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <DashMetricCards
        totalLeads={totalLeads}
        newLeadsMonth={newLeadsMonth}
        gbpPosts={gbpPosts}
        reviewRequests={reviewRequests}
        activeAreas={activeAreas}
        visibilityScore={visScore}
        loading={leadsLoading || campaignsLoading}
      />

      {/* Storm Mode Status Banner */}
      <DashStormStatus status={stormStatus} recentStorm={recentStorm} />

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        {/* Lead Pipeline — 2 cols */}
        <div className="lg:col-span-2 min-w-0">
          <DashLeadPipeline leads={leads} loading={leadsLoading} isEmergencyLeads={true} />
        </div>
        {/* Visibility Score Breakdown */}
        <div>
          <DashVisibilityBreakdown
            score={visScore}
            companyProfile={companyProfile}
            areas={areas}
            gbpPostsCount={gbpPosts}
            reviewsData={reviewsData}
            leads={leads}
          />
        </div>
      </div>

      {/* Marketing Activity + Recommended Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
        <DashMarketingActivity campaigns={campaigns} loading={campaignsLoading} />
        <DashRecommendedActions
          companyProfile={companyProfile}
          areas={areas}
          campaigns={campaigns}
          leads={leads}
          visScore={visScore}
        />
      </div>
    </div>
    </RRAccessGate>
  );
}