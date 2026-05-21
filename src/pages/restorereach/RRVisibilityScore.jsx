import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import {
  TrendingUp, Building2, Star, Radio, FileText, Link, Camera,
  CheckCircle, AlertCircle, XCircle, ArrowUpRight, ChevronRight,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function getRating(score) {
  if (score >= 85) return { label: 'Excellent', color: '#10b981', bg: '#10b98120' };
  if (score >= 65) return { label: 'Strong',    color: '#3b82f6', bg: '#3b82f620' };
  if (score >= 40) return { label: 'Needs Work',color: '#f59e0b', bg: '#f59e0b20' };
  return               { label: 'Poor',         color: '#ef4444', bg: '#ef444420' };
}

function computeScores(profile, gbpPosts, reviews, areas, leads) {
  // 1. GBP Completeness (20 pts)
  const gbpFields = [
    profile?.company_name, profile?.phone, profile?.website,
    profile?.google_business_profile_url, profile?.google_review_link,
    profile?.address, profile?.city, profile?.state,
    profile?.primary_services?.length > 0,
    profile?.facebook_url || profile?.instagram_url,
  ];
  const gbpFilled = gbpFields.filter(Boolean).length;
  const gbpScore = Math.round((gbpFilled / gbpFields.length) * 20);

  // 2. Reviews (20 pts)
  const reviewCount = reviews.filter(r => r.status === 'reviewed').length;
  const reviewScore = Math.min(20, reviewCount >= 20 ? 20 : reviewCount >= 10 ? 16 : reviewCount >= 5 ? 12 : reviewCount >= 1 ? 6 : 0);

  // 3. Posting Activity (15 pts)
  const postCount = gbpPosts.length;
  const postScore = Math.min(15, postCount >= 20 ? 15 : postCount >= 10 ? 12 : postCount >= 5 ? 9 : postCount >= 1 ? 4 : 0);

  // 4. Local Content / SEO pages (20 pts)
  const seoPagesCount = areas.reduce((sum, a) => sum + (a.seo_pages?.length || 0), 0);
  const areaCount = areas.length;
  const contentScore = Math.min(20,
    (seoPagesCount >= 10 ? 12 : seoPagesCount >= 5 ? 8 : seoPagesCount >= 1 ? 4 : 0) +
    (areaCount >= 5 ? 8 : areaCount >= 3 ? 5 : areaCount >= 1 ? 2 : 0)
  );

  // 5. Citations (presence of consistent NAP) (10 pts)
  const hasNap = !!(profile?.company_name && profile?.phone && profile?.address);
  const hasMultiPlatform = !!(profile?.facebook_url && profile?.instagram_url);
  const citationScore = (hasNap ? 6 : 0) + (hasMultiPlatform ? 4 : 0);

  // 6. Photos (15 pts)
  const logoPresent = !!profile?.logo_url;
  const leadsWithPhotos = leads.filter(l => l.photos?.length > 0).length;
  const photoScore = (logoPresent ? 5 : 0) + Math.min(10, leadsWithPhotos >= 5 ? 10 : leadsWithPhotos >= 3 ? 7 : leadsWithPhotos >= 1 ? 3 : 0);

  const total = gbpScore + reviewScore + postScore + contentScore + citationScore + photoScore;

  return {
    total,
    categories: [
      {
        key: 'gbp',
        label: 'GBP Completeness',
        icon: Building2,
        score: gbpScore,
        max: 20,
        color: '#3b82f6',
        detail: `${gbpFilled} of ${gbpFields.length} profile fields filled`,
        weaknesses: [
          !profile?.google_business_profile_url && 'Missing GBP URL',
          !profile?.google_review_link && 'Missing Google Review link',
          !profile?.website && 'No website URL set',
          !profile?.phone && 'No phone number set',
          !profile?.city && 'Location not filled in',
          !(profile?.facebook_url || profile?.instagram_url) && 'No social media links',
        ].filter(Boolean),
        recommendations: [
          !profile?.google_business_profile_url && 'Add your Google Business Profile URL in Settings',
          !profile?.google_review_link && 'Add your direct Google review link to get more reviews',
          !profile?.website && 'Add your website URL to improve citations',
          !(profile?.primary_services?.length > 0) && 'Select your primary services in Settings',
        ].filter(Boolean),
      },
      {
        key: 'reviews',
        label: 'Reviews',
        icon: Star,
        score: reviewScore,
        max: 20,
        color: '#f59e0b',
        detail: `${reviewCount} verified review${reviewCount !== 1 ? 's' : ''}`,
        weaknesses: [
          reviewCount === 0 && 'No reviews collected yet',
          reviewCount < 5  && reviewCount > 0 && 'Fewer than 5 reviews — need more social proof',
          reviewCount < 10 && reviewCount >= 5 && 'Under 10 reviews — keep requesting',
        ].filter(Boolean),
        recommendations: [
          reviewCount < 10 && 'Use Review Automation to send SMS review requests after every job',
          reviewCount < 5  && 'Aim for 5+ reviews to establish credibility on Google',
        ].filter(Boolean),
      },
      {
        key: 'posting',
        label: 'Posting Activity',
        icon: Radio,
        score: postScore,
        max: 15,
        color: '#8b5cf6',
        detail: `${postCount} GBP post${postCount !== 1 ? 's' : ''} created`,
        weaknesses: [
          postCount === 0 && 'No GBP posts created',
          postCount < 5   && postCount > 0 && 'Low post frequency — Google rewards consistent posting',
          postCount < 10  && postCount >= 5 && 'Keep posting — aim for 10+ posts',
        ].filter(Boolean),
        recommendations: [
          postCount < 5  && 'Create at least 2 GBP posts per week using the GBP Command Center',
          postCount < 10 && 'Schedule posts in advance using the Post Calendar',
        ].filter(Boolean),
      },
      {
        key: 'content',
        label: 'Local Content',
        icon: FileText,
        score: contentScore,
        max: 20,
        color: '#10b981',
        detail: `${seoPagesCount} SEO page${seoPagesCount !== 1 ? 's' : ''} across ${areaCount} area${areaCount !== 1 ? 's' : ''}`,
        weaknesses: [
          areaCount === 0 && 'No service areas added',
          seoPagesCount === 0 && areaCount > 0 && 'Service areas added but no SEO pages generated',
          seoPagesCount < 5 && seoPagesCount > 0 && 'Few SEO pages — more content = more rankings',
        ].filter(Boolean),
        recommendations: [
          areaCount === 0 && 'Add your top service cities in the Service Area SEO Manager',
          seoPagesCount < 3 && areaCount > 0 && 'Generate SEO pages for all your service cities',
          seoPagesCount < 10 && 'Add more service areas to expand your local search presence',
        ].filter(Boolean),
      },
      {
        key: 'citations',
        label: 'Citations (NAP)',
        icon: Link,
        score: citationScore,
        max: 10,
        color: '#06b6d4',
        detail: hasNap ? 'NAP info complete' : 'NAP incomplete',
        weaknesses: [
          !profile?.company_name && 'Company name missing',
          !profile?.phone && 'Phone number missing',
          !profile?.address && 'Address missing',
          !hasMultiPlatform && 'Not listed on multiple platforms',
        ].filter(Boolean),
        recommendations: [
          !hasNap && 'Complete your Name, Address, Phone (NAP) in Settings for citation consistency',
          !profile?.facebook_url && 'Add your Facebook URL to improve multi-platform presence',
          !profile?.instagram_url && 'Add your Instagram URL to boost citation signals',
        ].filter(Boolean),
      },
      {
        key: 'photos',
        label: 'Photos',
        icon: Camera,
        score: photoScore,
        max: 15,
        color: '#e05a1c',
        detail: `${logoPresent ? 'Logo set' : 'No logo'} · ${leadsWithPhotos} job photo set${leadsWithPhotos !== 1 ? 's' : ''}`,
        weaknesses: [
          !logoPresent && 'No company logo uploaded',
          leadsWithPhotos === 0 && 'No job/damage photos captured',
          leadsWithPhotos < 3 && leadsWithPhotos > 0 && 'Very few job photos — add more before/after shots',
        ].filter(Boolean),
        recommendations: [
          !logoPresent && 'Upload your company logo in Settings',
          leadsWithPhotos < 5 && 'Add before/after photos when capturing emergency leads to build portfolio',
        ].filter(Boolean),
      },
    ],
  };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 140 }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, score / 100);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2d45" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>{score}</text>
      <text x="50" y="62" textAnchor="middle" fill="#7ba3c8" fontSize="8"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>out of 100</text>
    </svg>
  );
}

function CategoryBar({ cat }) {
  const pct = Math.round((cat.score / cat.max) * 100);
  const rating = getRating(pct);
  const Icon = cat.icon;
  return (
    <div className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: cat.color }} />
          <span className="text-xs font-semibold text-white">{cat.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: rating.bg, color: rating.color }}>{rating.label}</span>
          <span className="text-xs font-bold" style={{ color: cat.color }}>{cat.score}<span className="text-slate-500 font-normal">/{cat.max}</span></span>
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full mb-1.5" style={{ background: '#1e2d45' }}>
        <div className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: cat.color }} />
      </div>
      <p className="text-xs" style={{ color: '#7ba3c8' }}>{cat.detail}</p>
    </div>
  );
}

function WeaknessItem({ text, color = '#ef4444' }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b last:border-0" style={{ borderColor: '#1e2d45' }}>
      <XCircle size={14} style={{ color }} className="shrink-0 mt-0.5" />
      <span className="text-sm" style={{ color: '#c8d9eb' }}>{text}</span>
    </div>
  );
}

function RecommendationItem({ text, index }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: '#1e2d45' }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{ background: '#e05a1c25', color: '#e05a1c' }}>{index + 1}</div>
      <p className="text-sm flex-1" style={{ color: '#c8d9eb' }}>{text}</p>
      <ArrowUpRight size={13} style={{ color: '#3a5a7c' }} className="shrink-0 mt-0.5" />
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function RRVisibilityScore() {
  const { profile, companyId, profileLoading, isReady } = useRRCompany();

  const { data: gbpPosts = [] } = useQuery({
    queryKey: ['gbp-posts', companyId],
    queryFn: () => base44.entities.GBPPost.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ['review-requests', companyId],
    queryFn: () => base44.entities.ReviewRequest.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });
  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas', companyId],
    queryFn: () => base44.entities.RRServiceArea.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });
  const { data: leads = [] } = useQuery({
    queryKey: ['emergency-leads', companyId],
    queryFn: () => base44.entities.EmergencyLead.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });
  const { total, categories } = computeScores(profile, gbpPosts, reviews, areas, leads);
  const rating = getRating(total);

  const allWeaknesses = categories.flatMap(c => c.weaknesses.map(w => ({ text: w, color: getRating(Math.round(c.score / c.max * 100)).color })));
  const allRecommendations = categories.flatMap(c => c.recommendations);

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-4 md:p-7 max-w-5xl mx-auto space-y-5 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={22} style={{ color: '#e05a1c' }} /> Visibility Score
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Your local SEO and marketing health report across 6 key signals
        </p>
      </div>

      {/* Hero score */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4 md:gap-6">
          <div className="relative shrink-0">
            <ScoreRing score={total} color={rating.color} size={120} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2"
              style={{ background: rating.bg }}>
              <span className="text-sm font-bold" style={{ color: rating.color }}>{rating.label}</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-1">{total} / 100</h2>
            <p className="text-sm" style={{ color: '#7ba3c8' }}>
              {total >= 85 ? 'Your business has excellent local visibility. Keep it up!'
                : total >= 65 ? 'Strong visibility with a few gaps to close.'
                : total >= 40 ? 'Visibility needs improvement. Focus on the recommendations below.'
                : 'Critical visibility gaps detected. Take action to attract more local leads.'}
            </p>
          </div>

          {/* Mini rating legend */}
          <div className="shrink-0 space-y-1.5 text-right hidden lg:block">
            {[
              { label: 'Excellent', min: 85, color: '#10b981' },
              { label: 'Strong',    min: 65, color: '#3b82f6' },
              { label: 'Needs Work',min: 40, color: '#f59e0b' },
              { label: 'Poor',      min: 0,  color: '#ef4444' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2 justify-end">
                <span className="text-xs" style={{ color: total >= r.min && (r.min === 85 ? true : total < [85,65,40,0][[85,65,40,0].indexOf(r.min)-1] ?? true) ? r.color : '#3a5a7c' }}>{r.label}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: r.color, opacity: rating.label === r.label ? 1 : 0.25 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Score Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map(cat => <CategoryBar key={cat.key} cat={cat} />)}
        </div>
      </div>

      {/* Weaknesses + Recommendations side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Weaknesses */}
        <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
            <XCircle size={14} style={{ color: '#ef4444' }} />
            <h2 className="text-sm font-semibold text-white">Weaknesses</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>
              {allWeaknesses.length}
            </span>
          </div>
          <div className="px-5 py-2">
            {allWeaknesses.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle size={24} className="mx-auto mb-2" style={{ color: '#10b981' }} />
                <p className="text-sm text-white font-semibold">No critical weaknesses!</p>
              </div>
            ) : allWeaknesses.map((w, i) => (
              <WeaknessItem key={i} text={w.text} color={w.color} />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
            <ArrowUpRight size={14} style={{ color: '#10b981' }} />
            <h2 className="text-sm font-semibold text-white">Recommendations</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>
              {allRecommendations.length}
            </span>
          </div>
          <div className="px-5 py-2">
            {allRecommendations.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle size={24} className="mx-auto mb-2" style={{ color: '#10b981' }} />
                <p className="text-sm text-white font-semibold">All optimized!</p>
              </div>
            ) : allRecommendations.map((rec, i) => (
              <RecommendationItem key={i} text={rec} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
    </RRAccessGate>
  );
}