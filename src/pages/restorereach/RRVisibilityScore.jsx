import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp, Star, MapPin, Globe, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

function ScoreRing({ score, max = 100, color = '#e05a1c', size = 120 }) {
  const r = 45;
  const c = 2 * Math.PI * r;
  const pct = score / max;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2d45" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="54" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{score}</text>
    </svg>
  );
}

function CheckItem({ label, status }) {
  const Icon = status === 'good' ? CheckCircle : status === 'warn' ? AlertCircle : XCircle;
  const color = status === 'good' ? '#10b981' : status === 'warn' ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: '#1e2d45' }}>
      <Icon size={16} style={{ color }} className="shrink-0" />
      <span className="text-sm text-white flex-1">{label}</span>
      <span className="text-xs capitalize font-medium" style={{ color }}>{status}</span>
    </div>
  );
}

export default function RRVisibilityScore() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list(),
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list(),
  });
  const { data: leads = [] } = useQuery({
    queryKey: ['rr-leads'],
    queryFn: () => base44.entities.RRLeadCapture.list(),
  });

  const companyProfile = profile?.[0];

  // Score calculation
  const checks = [
    { label: 'Company profile complete', status: companyProfile?.company_name ? 'good' : 'missing' },
    { label: 'Google Business Profile URL set', status: companyProfile?.google_business_profile_url ? 'good' : 'missing' },
    { label: 'Google Review link configured', status: companyProfile?.google_review_link ? 'good' : 'missing' },
    { label: 'Service areas defined (3+)', status: areas.length >= 3 ? 'good' : areas.length > 0 ? 'warn' : 'missing' },
    { label: 'GBP posts created (5+)', status: campaigns.filter(c => c.campaign_type === 'gbp_post').length >= 5 ? 'good' : campaigns.filter(c => c.campaign_type === 'gbp_post').length > 0 ? 'warn' : 'missing' },
    { label: 'SEO content generated', status: campaigns.filter(c => c.campaign_type === 'seo_content').length > 0 ? 'good' : 'missing' },
    { label: 'Storm campaigns ready', status: campaigns.filter(c => c.campaign_type === 'storm_alert').length > 0 ? 'good' : 'warn' },
    { label: 'Lead capture active', status: leads.length > 0 ? 'good' : 'warn' },
    { label: 'Social media URLs set', status: companyProfile?.facebook_url || companyProfile?.instagram_url ? 'good' : 'warn' },
    { label: 'Website URL configured', status: companyProfile?.website ? 'good' : 'missing' },
  ];

  const goodCount = checks.filter(c => c.status === 'good').length;
  const score = Math.round((goodCount / checks.length) * 100);

  const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';

  const categories = [
    { label: 'GBP Posts', count: campaigns.filter(c => c.campaign_type === 'gbp_post').length, icon: Globe, color: '#3b82f6' },
    { label: 'SEO Pages', count: campaigns.filter(c => c.campaign_type === 'seo_content').length, icon: TrendingUp, color: '#10b981' },
    { label: 'Service Areas', count: areas.length, icon: MapPin, color: '#8b5cf6' },
    { label: 'Total Leads', count: leads.length, icon: Star, color: '#e05a1c' },
  ];

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={22} style={{ color: '#e05a1c' }} /> Visibility Score
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Your local marketing health and visibility report</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Score Ring */}
        <div className="rounded-xl border p-6 flex flex-col items-center justify-center text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <ScoreRing score={score} color={scoreColor} size={130} />
          <p className="text-lg font-bold mt-3" style={{ color: scoreColor }}>{scoreLabel}</p>
          <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>Overall Visibility Score</p>
          <p className="text-xs mt-1" style={{ color: '#3a5a7c' }}>{goodCount} of {checks.length} checks passed</p>
        </div>

        {/* Category stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {categories.map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border p-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color }} />
                <p className="text-xs font-medium" style={{ color: '#7ba3c8' }}>{label}</p>
              </div>
              <p className="text-3xl font-bold" style={{ color }}>{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <h2 className="text-sm font-semibold text-white mb-3">Visibility Checklist</h2>
        <div className="divide-y" style={{ divideColor: '#1e2d45' }}>
          {checks.map((c) => <CheckItem key={c.label} {...c} />)}
        </div>
      </div>

      {score < 100 && (
        <div className="mt-4 rounded-xl border border-orange-500/30 p-4" style={{ background: '#1a0a00' }}>
          <p className="text-sm font-semibold text-orange-400 mb-1">🚀 How to improve your score</p>
          <ul className="text-xs space-y-1" style={{ color: '#f59e0b' }}>
            {checks.filter(c => c.status !== 'good').map(c => (
              <li key={c.label}>• Complete: {c.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}