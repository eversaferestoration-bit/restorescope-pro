import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

function CheckItem({ label, ok, warn }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertCircle : XCircle;
  const color = ok ? '#10b981' : warn ? '#f59e0b' : '#ef4444';
  const statusText = ok ? 'Done' : warn ? 'Partial' : 'Missing';
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: '#1e2d45' }}>
      <div className="flex items-center gap-3">
        <Icon size={16} style={{ color }} />
        <span className="text-sm text-white">{label}</span>
      </div>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color, background: color + '20' }}>{statusText}</span>
    </div>
  );
}

export default function GBPHealthChecklist({ profile, gbpPosts, areas }) {
  const checks = [
    {
      label: 'Website URL added to GBP',
      ok: !!profile?.website,
    },
    {
      label: 'Business phone number added',
      ok: !!profile?.phone,
    },
    {
      label: 'Service areas defined',
      ok: areas.length >= 3,
      warn: areas.length > 0 && areas.length < 3,
    },
    {
      label: 'Photos uploaded (via GBP or campaigns)',
      ok: gbpPosts >= 3,
      warn: gbpPosts > 0 && gbpPosts < 3,
    },
    {
      label: 'Google Review link configured',
      ok: !!profile?.google_review_link,
    },
    {
      label: 'GBP posts active (5+ recommended)',
      ok: gbpPosts >= 5,
      warn: gbpPosts > 0 && gbpPosts < 5,
    },
    {
      label: 'Business description written',
      ok: !!profile?.gbp_description || !!profile?.company_name,
    },
    {
      label: 'GBP categories selected',
      ok: profile?.gbp_categories?.length > 0,
    },
  ];

  const passed = checks.filter(c => c.ok).length;
  const pct = Math.round((passed / checks.length) * 100);
  const scoreColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <h2 className="text-sm font-semibold text-white">GBP Health Checklist</h2>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: scoreColor }} />
          </div>
          <span className="text-xs font-bold" style={{ color: scoreColor }}>{pct}%</span>
        </div>
      </div>
      <div className="px-5">
        {checks.map(c => <CheckItem key={c.label} {...c} />)}
      </div>
    </div>
  );
}