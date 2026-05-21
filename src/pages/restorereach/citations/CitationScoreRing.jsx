export default function CitationScoreRing({ score, size = 120 }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, score / 100);
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Strong' : score >= 50 ? 'Fair' : 'Weak';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2d45" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>{score}</text>
        <text x="50" y="62" textAnchor="middle" fill="#7ba3c8" fontSize="9"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>/ 100</text>
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{label}</span>
    </div>
  );
}