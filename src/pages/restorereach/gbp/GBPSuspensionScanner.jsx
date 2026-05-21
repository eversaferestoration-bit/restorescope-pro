import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Scan } from 'lucide-react';

function RiskBadge({ level }) {
  const map = {
    Low: 'bg-green-500/20 text-green-400 border-green-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return <span className={`text-sm font-bold px-3 py-1 rounded-full border ${map[level]}`}>{level} Risk</span>;
}

function RiskItem({ label, status, detail }) {
  const Icon = status === 'pass' ? CheckCircle : status === 'warn' ? AlertTriangle : XCircle;
  const color = status === 'pass' ? '#10b981' : status === 'warn' ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: '#1e2d4530' }}>
      <Icon size={15} style={{ color }} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {detail && <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>{detail}</p>}
      </div>
      <span className="text-xs font-medium capitalize" style={{ color }}>{status}</span>
    </div>
  );
}

export default function GBPSuspensionScanner({ profile }) {
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [checks, setChecks] = useState([]);
  const [overallRisk, setOverallRisk] = useState('Low');

  const runScan = () => {
    setScanning(true);
    setTimeout(() => {
      const name = profile?.company_name || '';
      const desc = profile?.gbp_description || '';
      const cats = profile?.gbp_categories || '';

      // Keyword stuffing: name or description has repeated service keywords
      const serviceWords = ['water damage', 'fire', 'mold', 'restoration', 'flood', 'emergency'];
      const nameMatches = serviceWords.filter(w => name.toLowerCase().includes(w));
      const keywordStuffing = nameMatches.length > 1;

      // Missing website
      const missingWebsite = !profile?.website;

      // Missing/inconsistent phone
      const missingPhone = !profile?.phone;

      // Category mismatch: description mentions services not in categories
      const descHasWater = desc.toLowerCase().includes('water');
      const catsHasWater = cats.toLowerCase().includes('water') || cats === '';
      const categoryMismatch = descHasWater && !catsHasWater && cats !== '';

      // Missing GBP URL
      const missingGbpUrl = !profile?.google_business_profile_url;

      const results = [
        {
          label: 'Keyword stuffing in business name',
          status: keywordStuffing ? 'fail' : 'pass',
          detail: keywordStuffing
            ? `Business name contains "${nameMatches.join(', ')}" — Google may flag service keywords in the name.`
            : 'Business name looks clean.',
        },
        {
          label: 'Website URL configured',
          status: missingWebsite ? 'fail' : 'pass',
          detail: missingWebsite ? 'Missing website is a top suspension trigger.' : 'Website is set.',
        },
        {
          label: 'Phone number present',
          status: missingPhone ? 'warn' : 'pass',
          detail: missingPhone ? 'Missing phone can signal an incomplete or spam profile.' : 'Phone number is set.',
        },
        {
          label: 'Category mismatch',
          status: categoryMismatch ? 'warn' : 'pass',
          detail: categoryMismatch
            ? 'Your description mentions services not reflected in your categories.'
            : 'Categories appear consistent with your description.',
        },
        {
          label: 'GBP Profile URL linked',
          status: missingGbpUrl ? 'warn' : 'pass',
          detail: missingGbpUrl ? 'Add your GBP profile URL to enable monitoring.' : 'GBP URL is configured.',
        },
        {
          label: 'Business description present',
          status: !desc || desc.length < 50 ? 'warn' : 'pass',
          detail: !desc ? 'No description — profiles without descriptions are higher risk.' : desc.length < 50 ? 'Description is too short.' : 'Description looks good.',
        },
      ];

      const fails = results.filter(r => r.status === 'fail').length;
      const warns = results.filter(r => r.status === 'warn').length;
      const risk = fails >= 2 ? 'High' : fails === 1 || warns >= 3 ? 'Medium' : 'Low';

      setChecks(results);
      setOverallRisk(risk);
      setScanning(false);
      setScanned(true);
    }, 1400);
  };

  return (
    <div className="rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield size={15} style={{ color: '#8b5cf6' }} /> GBP Suspension Risk Scanner
        </h2>
        {scanned && <RiskBadge level={overallRisk} />}
      </div>

      <p className="text-xs mb-4" style={{ color: '#7ba3c8' }}>
        Scan your profile for common triggers that can lead to Google suspension: keyword stuffing, missing info, category mismatches, and more.
      </p>

      <button onClick={runScan} disabled={scanning || !profile}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition flex items-center justify-center gap-2"
        style={{ background: '#8b5cf6' }}>
        {scanning
          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning…</>
          : <><Scan size={14} /> {scanned ? 'Re-scan Profile' : 'Run Suspension Risk Scan'}</>
        }
      </button>

      {!profile && (
        <p className="text-xs mt-2 text-center" style={{ color: '#f59e0b' }}>Complete your GBP profile above before scanning.</p>
      )}

      {scanned && checks.length > 0 && (
        <div className="mt-4">
          {checks.map(c => <RiskItem key={c.label} {...c} />)}

          <div className={`mt-4 rounded-lg p-3 border text-sm ${
            overallRisk === 'Low' ? 'border-green-500/30 text-green-400' :
            overallRisk === 'Medium' ? 'border-yellow-500/30 text-yellow-400' :
            'border-red-500/30 text-red-400'
          }`} style={{ background: overallRisk === 'Low' ? '#0a1a10' : overallRisk === 'Medium' ? '#1a1200' : '#1a0505' }}>
            {overallRisk === 'Low' && '✅ Your profile looks healthy. Keep posting regularly to maintain ranking.'}
            {overallRisk === 'Medium' && '⚠️ Fix the warnings above to reduce suspension risk and improve ranking.'}
            {overallRisk === 'High' && '🚨 High suspension risk detected. Address the failing checks immediately.'}
          </div>
        </div>
      )}
    </div>
  );
}