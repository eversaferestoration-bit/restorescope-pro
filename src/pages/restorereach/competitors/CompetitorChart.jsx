import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend, Cell
} from 'recharts';

const COLORS = ['#e05a1c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d1829', border: '1px solid #1e2d45', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: '#c8d9eb' },
  itemStyle: { color: '#7ba3c8' },
};

export function VisibilityBarChart({ competitors, myScore, myName = 'You' }) {
  const data = [
    { name: myName, score: myScore, isMe: true },
    ...competitors.map(c => ({ name: c.competitor_name, score: c.visibility_score || 0, isMe: false })),
  ].sort((a, b) => b.score - a.score).slice(0, 8);

  return (
    <div className="rounded-2xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <p className="text-sm font-bold text-white mb-4">Visibility Score Comparison</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
          <XAxis dataKey="name" tick={{ fill: '#7ba3c8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} domain={[0, 100]} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}/100`, 'Score']} />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isMe ? '#e05a1c' : COLORS[(i) % COLORS.length]} opacity={entry.isMe ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReviewsBarChart({ competitors }) {
  const data = [...competitors]
    .sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0))
    .slice(0, 8)
    .map((c, i) => ({ name: c.competitor_name, reviews: c.google_review_count || 0, rating: c.google_rating || 0, color: COLORS[i % COLORS.length] }));

  return (
    <div className="rounded-2xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <p className="text-sm font-bold text-white mb-4">Review Count Comparison</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
          <XAxis dataKey="name" tick={{ fill: '#7ba3c8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [v, n === 'reviews' ? 'Reviews' : 'Rating']} />
          <Bar dataKey="reviews" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}