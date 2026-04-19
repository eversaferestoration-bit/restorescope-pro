import { cn } from '@/lib/utils';

const RISK_COLOR = {
  low: { text: 'text-green-600', ring: '#16a34a', bg: 'bg-green-50 border-green-200', label: 'Low Risk' },
  medium: { text: 'text-amber-600', ring: '#d97706', bg: 'bg-amber-50 border-amber-200', label: 'Medium Risk' },
  high: { text: 'text-red-600', ring: '#dc2626', bg: 'bg-red-50 border-red-200', label: 'High Risk' },
};

function scoreColor(score) {
  if (score >= 75) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function scoreLabel(score) {
  if (score >= 75) return 'Well Defended';
  if (score >= 50) return 'Moderate';
  return 'Vulnerable';
}

export default function DefenseScoreRing({ score, pushbackRisk, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = scoreColor(score);
  const riskCfg = RISK_COLOR[pushbackRisk] || RISK_COLOR.medium;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={10} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-display" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground font-medium">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color }}>{scoreLabel(score)}</p>
        <span className={cn('mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', riskCfg.bg, riskCfg.text)}>
          {riskCfg.label} Carrier Risk
        </span>
      </div>
    </div>
  );
}