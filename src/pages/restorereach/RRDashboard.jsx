import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['rr-leads'],
    queryFn: () => base44.entities.RRLeadCapture.list('-created_date', 200),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list(),
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list('-created_date', 100),
  });

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const companyProfile = profile?.[0];

  // Derived metrics
  const now = new Date();
  const monthStart = startOfMonth(now);
  const totalLeads = leads.length;
  const newLeadsMonth = leads.filter(l => new Date(l.created_date || l.created_at || 0) >= monthStart).length;
  const gbpPosts = campaigns.filter(c => c.campaign_type === 'gbp_post').length;
  const reviewRequests = campaigns.filter(c => c.campaign_type === 'review_request').length;
  const activeAreas = areas.length;

  // Visibility score calculation (same logic as visibility page)
  const visChecks = [
    companyProfile?.company_name,
    companyProfile?.google_business_profile_url,
    companyProfile?.google_review_link,
    areas.length >= 3,
    gbpPosts >= 5,
    campaigns.filter(c => c.campaign_type === 'seo_content').length > 0,
    campaigns.filter(c => c.campaign_type === 'storm_alert').length > 0,
    leads.length > 0,
    companyProfile?.facebook_url || companyProfile?.instagram_url,
    companyProfile?.website,
  ];
  const visScore = Math.round((visChecks.filter(Boolean).length / visChecks.length) * 100);

  // Storm mode status: active if there's an active storm_alert campaign created in last 48hrs
  const recentStorm = campaigns.find(c => {
    if (c.campaign_type !== 'storm_alert') return false;
    const age = now - new Date(c.created_date || c.created_at || 0);
    return c.status === 'active' && age < 48 * 3600 * 1000;
  });
  const stormStatus = recentStorm ? 'active' : campaigns.some(c => c.campaign_type === 'storm_alert') ? 'monitoring' : 'inactive';

  return (
    <div className="p-5 md:p-7 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e05a1c' }}>
              <Zap size={17} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">RestoreReach AI</h1>
          </div>
          <p className="text-sm ml-12" style={{ color: '#7ba3c8' }}>Local marketing command center — real-time data</p>
        </div>
        <Link to="/restorereach/leads"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition"
          style={{ background: '#e05a1c' }}>
          <Phone size={14} /> Capture Lead
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lead Pipeline — 2 cols */}
        <div className="xl:col-span-2">
          <DashLeadPipeline leads={leads} loading={leadsLoading} />
        </div>
        {/* Visibility Score Breakdown */}
        <div>
          <DashVisibilityBreakdown
            score={visScore}
            companyProfile={companyProfile}
            areas={areas}
            campaigns={campaigns}
            leads={leads}
          />
        </div>
      </div>

      {/* Marketing Activity + Recommended Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
  );
}