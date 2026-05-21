import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp } from 'lucide-react';

import { calculateScore, CATEGORIES, getRating } from './visibility/ScoreEngine';
import ScoreRing from './visibility/ScoreRing';
import CategoryBreakdown from './visibility/CategoryBreakdown';
import WeaknessPanel from './visibility/WeaknessPanel';

export default function RRVisibilityScore() {
  const { user } = useAuth();

  const { data: profileArr = [] } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list(),
  });
  const { data: gbpPosts = [] } = useQuery({
    queryKey: ['gbp-posts'],
    queryFn: () => base44.entities.GBPPost.list(),
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list(),
  });
  const { data: leads = [] } = useQuery({
    queryKey: ['emergency-leads'],
    queryFn: () => base44.entities.EmergencyLead.list(),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ['rr-reviews'],
    queryFn: () => base44.entities.ReviewRequest.list(),
  });

  const profile = profileArr[0];

  const { total, checks } = calculateScore({ profile, areas, gbpPosts, campaigns, leads, reviews });
  const rating = getRating(total);

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={22} style={{ color: '#e05a1c' }} /> Visibility Score
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Your local marketing health across 6 key categories
        </p>
      </div>

      {/* Hero: Score ring + rating + category mini-bars */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          {/* Ring */}
          <div className="flex flex-col items-center justify-center text-center">
            <ScoreRing score={total} color={rating.color} size={160} />
            <div className="mt-3 px-4 py-1.5 rounded-full text-sm font-bold"
              style={{ background: rating.bg, color: rating.color }}>
              {rating.label}
            </div>
            <p className="text-xs mt-2" style={{ color: '#7ba3c8' }}>
              Local Visibility Score
            </p>
          </div>

          {/* Category mini-bars */}
          <div className="sm:col-span-2 space-y-3">
            {CATEGORIES.map(cat => {
              const d = checks[cat.key];
              const pct = Math.round((d.score / d.max) * 100);
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: '#c8d9eb' }}>
                      {cat.icon} {cat.label}
                    </span>
                    <span className="text-xs font-bold" style={{ color: cat.color }}>
                      {d.score}/{d.max}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rating bands bar */}
        <div className="px-6 pb-5">
          <div className="flex rounded-full overflow-hidden h-2">
            <div className="flex-1" style={{ background: '#ef4444' }} />
            <div className="flex-[1.5]" style={{ background: '#f59e0b' }} />
            <div className="flex-[1.5]" style={{ background: '#3b82f6' }} />
            <div className="flex-[2]" style={{ background: '#10b981' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs" style={{ color: '#3a5a7c' }}>
            <span>Poor (0-39)</span>
            <span>Needs Work (40-59)</span>
            <span>Strong (60-79)</span>
            <span>Excellent (80+)</span>
          </div>
        </div>
      </div>

      {/* Bottom: Breakdown + Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CategoryBreakdown checks={checks} />
        <WeaknessPanel checks={checks} />
      </div>
    </div>
  );
}