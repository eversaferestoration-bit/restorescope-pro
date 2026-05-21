import { CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

const checks = [
  { key: 'website', label: 'Website URL added', check: p => !!p?.website },
  { key: 'phone', label: 'Phone number added', check: p => !!p?.phone },
  { key: 'service_areas', label: 'Service areas defined', check: (p, areas) => areas?.length > 0 },
  { key: 'review_link', label: 'Review link configured', check: p => !!p?.google_review_link },
  { key: 'gbp_url', label: 'GBP Profile URL set', check: p => !!p?.google_business_profile_url },
  { key: 'description', label: 'Business description written', check: p => !!p?.gbp_description && p.gbp_description.length > 50 },
  { key: 'categories', label: 'Categories configured', check: p => !!p?.gbp_categories },
  { key: 'posts', label: 'GBP posts created (3+)', check: (p, areas, posts) => posts >= 3 },
];

export default function GBPHealthChecklist({ profile, serviceAreas = [], postsCount = 0 }) {
  const results = checks.map(c => ({
    ...c,
    passed: c.check(profile, serviceAreas, postsCount),
  }));

  const passed = results.filter(r => r.passed).length;
  const score = Math.round((passed / results.length) * 100);
  const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp size={15} style={{ color: '#3b82f6' }} /> GBP Health Checklist
        </h2>
        <span className="text-sm font-bold" style={{ color: scoreColor }}>{score}% Complete</span>
      </div>

      <div className="h-1.5 rounded-full mb-4" style={{ background: '#1e2d45' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: scoreColor }} />
      </div>

      <div className="space-y-2">
        {results.map(({ key, label, passed }) => (
          <div key={key} className="flex items-center gap-3 py-1.5 border-b last:border-0" style={{ borderColor: '#1e2d4530' }}>
            {passed
              ? <CheckCircle size={15} className="shrink-0" style={{ color: '#10b981' }} />
              : <XCircle size={15} className="shrink-0" style={{ color: '#ef444480' }} />
            }
            <span className="text-sm" style={{ color: passed ? '#c8d9eb' : '#7ba3c8' }}>{label}</span>
            {!passed && <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ background: '#2a1010', color: '#ef4444' }}>Missing</span>}
          </div>
        ))}
      </div>
    </div>
  );
}