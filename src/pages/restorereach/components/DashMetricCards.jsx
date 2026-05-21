import { Phone, Star, MapPin, TrendingUp, Building2, Activity } from 'lucide-react';

function MetricCard({ label, value, icon: IconComp, color, sub, loading }) {
  const Icon = IconComp;
  return (
    <div className="rounded-xl border p-4 md:p-5 flex flex-col gap-2.5 md:gap-3" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={17} style={{ color }} />
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>live</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 rounded animate-pulse" style={{ background: '#1e2d45' }} />
      ) : (
        <p className="text-2xl md:text-3xl font-bold text-white leading-none">{value ?? 0}</p>
      )}
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#3a5a7c' }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function DashMetricCards({ totalLeads, newLeadsMonth, gbpPosts, reviewRequests, activeAreas, visibilityScore, loading }) {
  const cards = [
    { label: 'Total Leads', value: totalLeads, icon: Phone, color: '#e05a1c', sub: 'All time' },
    { label: 'New Leads This Month', value: newLeadsMonth, icon: Activity, color: '#ef4444', sub: 'Current month' },
    { label: 'GBP Posts Created', value: gbpPosts, icon: Building2, color: '#3b82f6', sub: 'Published to Google' },
    { label: 'Review Requests Sent', value: reviewRequests, icon: Star, color: '#f59e0b', sub: 'Review campaigns' },
    { label: 'Active Service Areas', value: activeAreas, icon: MapPin, color: '#8b5cf6', sub: 'Tracked zones' },
    { label: 'Visibility Score', value: `${visibilityScore}/100`, icon: TrendingUp, color: '#10b981', sub: visibilityScore >= 80 ? 'Excellent' : visibilityScore >= 60 ? 'Strong' : visibilityScore >= 40 ? 'Needs Work' : 'Poor' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
      {cards.map((c) => <MetricCard key={c.label} {...c} loading={loading} />)}
    </div>
  );
}