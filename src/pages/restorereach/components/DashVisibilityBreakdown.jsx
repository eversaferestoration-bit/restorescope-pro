import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

function ScoreBar({ label, value, color }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ScoreRing({ score, color, size = 96 }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2d45" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="55" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">{score}</text>
    </svg>
  );
}

export default function DashVisibilityBreakdown({ score, companyProfile, areas, gbpPostsCount = 0, reviewsData = [], leads = [] }) {
  const reviewCount = reviewsData.filter(r => r.status === 'reviewed').length;
  const seoPagesCount = areas.reduce((sum, a) => sum + (a.seo_pages?.length || 0), 0);

  // Compute sub-scores as percentages (0-100) matching the real score engine
  const subScores = [
    {
      label: 'GBP Completeness',
      value: Math.round(([
        companyProfile?.company_name, companyProfile?.phone, companyProfile?.website,
        companyProfile?.google_business_profile_url, companyProfile?.google_review_link,
        companyProfile?.address, companyProfile?.city,
      ].filter(Boolean).length / 7) * 100),
      color: '#3b82f6',
    },
    {
      label: 'Reviews',
      value: reviewCount >= 20 ? 100 : reviewCount >= 10 ? 80 : reviewCount >= 5 ? 60 : reviewCount >= 1 ? 30 : 0,
      color: '#f59e0b',
    },
    {
      label: 'Posting Activity',
      value: gbpPostsCount >= 20 ? 100 : gbpPostsCount >= 10 ? 80 : gbpPostsCount >= 5 ? 60 : gbpPostsCount >= 1 ? 27 : 0,
      color: '#8b5cf6',
    },
    {
      label: 'Local SEO Content',
      value: Math.min(100, seoPagesCount >= 10 ? 100 : seoPagesCount >= 5 ? 75 : seoPagesCount >= 1 ? 40 : 0),
      color: '#10b981',
    },
    {
      label: 'Citation Consistency',
      value: Math.min(100,
        (companyProfile?.company_name ? 25 : 0) +
        (companyProfile?.phone ? 25 : 0) +
        (companyProfile?.address ? 25 : 0) +
        (companyProfile?.website ? 25 : 0)
      ),
      color: '#e05a1c',
    },
  ];

  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Strong' : score >= 40 ? 'Needs Work' : 'Poor';

  return (
    <div className="rounded-xl border overflow-hidden h-full" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={15} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">Visibility Score</h2>
        </div>
        <Link to="/restorereach/visibility" className="text-xs hover:text-orange-400 transition" style={{ color: '#7ba3c8' }}>
          Full report →
        </Link>
      </div>

      <div className="p-5">
        {/* Ring + label */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b" style={{ borderColor: '#1e2d45' }}>
          <ScoreRing score={score} color={scoreColor} />
          <div>
            <p className="text-lg font-bold" style={{ color: scoreColor }}>{scoreLabel}</p>
            <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>Overall visibility</p>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-4">
          {subScores.map((s) => (
            <ScoreBar key={s.label} label={s.label} value={s.value} color={s.color} />
          ))}
        </div>
      </div>
    </div>
  );
}