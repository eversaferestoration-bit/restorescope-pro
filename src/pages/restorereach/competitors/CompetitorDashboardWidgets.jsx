import { Trophy, Star, Radio, Target } from 'lucide-react';

const FREQ_ORDER = { daily: 5, weekly: 4, biweekly: 3, monthly: 2, rarely: 1, unknown: 0 };

function Widget({ icon: IconComponent, iconColor, label, value, sub, highlight }) {
  const Icon = IconComponent;
  return (
    <div className="rounded-2xl border p-4" style={{ background: '#0d1829', borderColor: highlight ? iconColor + '60' : '#1e2d45' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconColor + '20' }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <p className="text-xs font-semibold" style={{ color: '#7ba3c8' }}>{label}</p>
      </div>
      <p className="text-base font-bold text-white leading-tight truncate">{value || '—'}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#3a5a7c' }}>{sub}</p>}
    </div>
  );
}

export default function CompetitorDashboardWidgets({ competitors }) {
  if (!competitors?.length) return null;

  const active = competitors.filter(c => !c.is_deleted);

  const topReviews = [...active].sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0))[0];
  const highestRated = [...active].sort((a, b) => (b.google_rating || 0) - (a.google_rating || 0))[0];
  const lowestPosting = [...active].sort((a, b) => (FREQ_ORDER[a.estimated_post_frequency] || 0) - (FREQ_ORDER[b.estimated_post_frequency] || 0))[0];
  const lowestVis = [...active].sort((a, b) => (a.visibility_score || 0) - (b.visibility_score || 0))[0];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Widget
        icon={Trophy} iconColor="#f59e0b" label="Top by Reviews"
        value={topReviews?.competitor_name}
        sub={`${topReviews?.google_review_count || 0} reviews`}
        highlight
      />
      <Widget
        icon={Star} iconColor="#10b981" label="Highest Rated"
        value={highestRated?.competitor_name}
        sub={`${highestRated?.google_rating?.toFixed(1) || '—'} ★`}
      />
      <Widget
        icon={Radio} iconColor="#8b5cf6" label="Lowest Posting"
        value={lowestPosting?.competitor_name}
        sub={lowestPosting?.estimated_post_frequency || 'unknown'}
      />
      <Widget
        icon={Target} iconColor="#e05a1c" label="Easiest Ranking"
        value={lowestVis?.competitor_name}
        sub={`Visibility: ${lowestVis?.visibility_score || 0}/100`}
        highlight
      />
    </div>
  );
}