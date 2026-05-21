import { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Scan } from 'lucide-react';

function RiskBadge({ level }) {
  const config = {
    Low: { color: '#10b981', bg: '#10b98120', icon: ShieldCheck },
    Medium: { color: '#f59e0b', bg: '#f59e0b20', icon: AlertTriangle },
    High: { color: '#ef4444', bg: '#ef444420', icon: ShieldAlert },
  };
  const cfg = config[level] || config.Low;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: cfg.bg, borderColor: cfg.color + '50' }}>
      <Icon size={18} style={{ color: cfg.color }} />
      <span className="text-base font-bold" style={{ color: cfg.color }}>{level} Risk</span>
    </div>
  );
}

function RiskItem({ label, status, detail }) {
  const color = status === 'ok' ? '#10b981' : status === 'warn' ? '#f59e0b' : '#ef4444';
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗';
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: '#1e2d45' }}>
      <span className="text-sm font-bold w-5 shrink-0" style={{ color }}>{icon}</span>
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {detail && <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>{detail}</p>}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color, background: color + '20' }}>
        {status === 'ok' ? 'OK' : status === 'warn' ? 'Warning' : 'Risk'}
      </span>
    </div>
  );
}

function runScan(profile, gbpPosts, areas) {
  const issues = [];

  // 1. Missing website
  const noWebsite = !profile?.website;
  issues.push({
    label: 'Website URL',
    status: noWebsite ? 'fail' : 'ok',
    detail: noWebsite ? 'Missing website increases suspension risk. Add your URL.' : `Website set: ${profile.website}`,
    weight: 2,
  });

  // 2. Missing or incomplete phone
  const badPhone = !profile?.phone;
  issues.push({
    label: 'Phone Number',
    status: badPhone ? 'fail' : 'ok',
    detail: badPhone ? 'No phone number on GBP profile.' : `Phone: ${profile.phone}`,
    weight: 2,
  });

  // 3. Keyword stuffing in business name
  const KEYWORDS = ['water damage', 'restoration', 'fire damage', 'mold', 'emergency', '24/7', 'best', '#1'];
  const nameLower = (profile?.company_name || '').toLowerCase();
  const keywordCount = KEYWORDS.filter(k => nameLower.includes(k)).length;
  issues.push({
    label: 'Keyword Stuffing in Business Name',
    status: keywordCount >= 2 ? 'fail' : keywordCount === 1 ? 'warn' : 'ok',
    detail: keywordCount >= 2
      ? `Business name contains ${keywordCount} GBP-restricted keywords. This can trigger suspension.`
      : keywordCount === 1
        ? "One keyword detected. Consider if it's your actual registered business name."
        : 'Business name looks clean.',
    weight: 3,
  });

  // 4. Inconsistent phone (check if phone looks real — basic format check)
  const phone = profile?.phone || '';
  const phoneDigits = phone.replace(/\D/g, '');
  const badPhoneFormat = phone && (phoneDigits.length < 10 || phoneDigits.length > 11);
  issues.push({
    label: 'Phone Number Format',
    status: !phone ? 'fail' : badPhoneFormat ? 'warn' : 'ok',
    detail: !phone ? 'No phone added.' : badPhoneFormat ? 'Phone format may be incorrect — verify it matches your GBP listing.' : 'Phone format looks consistent.',
    weight: 1,
  });

  // 5. Category mismatch
  const hasCategories = profile?.gbp_categories?.length > 0;
  const hasPrimaryServices = profile?.primary_services?.length > 0;
  issues.push({
    label: 'Category & Service Mismatch',
    status: !hasCategories ? 'warn' : 'ok',
    detail: !hasCategories
      ? 'No GBP categories selected. Mismatched or missing categories can cause listing issues.'
      : `${profile.gbp_categories.length} categor${profile.gbp_categories.length === 1 ? 'y' : 'ies'} selected.`,
    weight: 2,
  });

  // 6. GBP URL present
  issues.push({
    label: 'GBP Profile URL Linked',
    status: profile?.google_business_profile_url ? 'ok' : 'warn',
    detail: profile?.google_business_profile_url ? 'GBP URL configured.' : 'Link your GBP URL in profile settings.',
    weight: 1,
  });

  // 7. Posts activity
  issues.push({
    label: 'Post Activity',
    status: gbpPosts >= 5 ? 'ok' : gbpPosts > 0 ? 'warn' : 'fail',
    detail: gbpPosts >= 5 ? `${gbpPosts} posts active — good activity signal.` : gbpPosts > 0 ? `Only ${gbpPosts} post(s). Aim for 5+ regular posts.` : 'No posts — inactive profiles attract suspension risk.',
    weight: 1,
  });

  // Calculate overall risk
  const failWeight = issues.filter(i => i.status === 'fail').reduce((s, i) => s + i.weight, 0);
  const warnWeight = issues.filter(i => i.status === 'warn').reduce((s, i) => s + i.weight * 0.5, 0);
  const totalRisk = failWeight + warnWeight;

  const level = totalRisk >= 5 ? 'High' : totalRisk >= 2 ? 'Medium' : 'Low';

  return { issues, level };
}

export default function GBPSuspensionScanner({ profile, gbpPosts, areas }) {
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  const runScanHandler = () => {
    setScanning(true);
    setTimeout(() => {
      const res = runScan(profile, gbpPosts, areas);
      setResult(res);
      setScanned(true);
      setScanning(false);
    }, 1200);
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">GBP Suspension Risk Scanner</h2>
        </div>
        <button
          onClick={runScanHandler}
          disabled={scanning}
          className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-60"
          style={{ background: '#e05a1c' }}>
          {scanning
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning…</>
            : <><Scan size={14} /> Scan Now</>}
        </button>
      </div>

      <div className="p-5">
        {!scanned && !scanning && (
          <div className="py-10 text-center">
            <ShieldAlert size={32} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
            <p className="text-white font-semibold">Run a Suspension Risk Scan</p>
            <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: '#7ba3c8' }}>
              Analyze your GBP profile for common suspension triggers: keyword stuffing, missing info, inconsistent data, and category mismatches.
            </p>
            <button onClick={runScanHandler}
              className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition"
              style={{ background: '#e05a1c' }}>
              Start Scan
            </button>
          </div>
        )}

        {scanning && (
          <div className="py-10 text-center">
            <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white font-semibold">Scanning your GBP profile…</p>
            <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>Checking for suspension risk signals</p>
          </div>
        )}

        {scanned && result && !scanning && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <RiskBadge level={result.level} />
              <button onClick={runScanHandler}
                className="text-xs px-3 py-1.5 rounded-lg transition"
                style={{ background: '#1e2d45', color: '#7ba3c8' }}>
                Re-scan
              </button>
            </div>

            <div className="text-sm px-1" style={{ color: '#7ba3c8' }}>
              {result.level === 'High' && '⚠️ High risk detected. Take action immediately to avoid GBP suspension.'}
              {result.level === 'Medium' && '🔶 Moderate risk. Some issues need attention to maintain listing health.'}
              {result.level === 'Low' && '✅ Profile looks healthy. Minor improvements possible.'}
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#1e2d45' }}>
              <div className="px-4 divide-y" style={{ borderColor: '#1e2d45' }}>
                {result.issues.map(item => (
                  <RiskItem key={item.label} label={item.label} status={item.status} detail={item.detail} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}