export default function ScoreRing({ score, color, size = 160 }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {/* Track */}
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1e2d45" strokeWidth="10" />
      {/* Progress */}
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      {/* Score text */}
      <text x="60" y="55" textAnchor="middle" fill="white" fontSize="26" fontWeight="800">{score}</text>
      <text x="60" y="72" textAnchor="middle" fill="#7ba3c8" fontSize="10">out of 100</text>
    </svg>
  );
}