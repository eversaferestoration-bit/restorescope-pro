import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import { subDays, isWithinInterval, differenceInHours, format, eachDayOfInterval } from 'date-fns';
import { BarChart2, Download, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

// ── Date Range Filter ──────────────────────────────────────────────────────────
const PRESETS = [
  { label: '7 Days',  days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

function DateRangeFilter({ range, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold shrink-0" style={{ color: '#7ba3c8' }}>Range:</span>
      {PRESETS.map(p => (
        <button key={p.label} onClick={() => onChange({ from: subDays(new Date(), p.days), to: new Date(), label: p.label })}
          className="text-xs px-3 py-1.5 rounded-lg border transition min-h-[36px]"
          style={range.label === p.label
            ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
            : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-2" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: color + '20', color }}>{label}</span>
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-xs" style={{ color: '#3a5a7c' }}>{sub}</p>
    </div>
  );
}

// ── Chart wrapper ─────────────────────────────────────────────────────────────
function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const TIP = { fill: '#0a1020', border: '1px solid #1e2d45' };
const tipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={TIP}>
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RRAnalytics() {
  const { companyId, profileLoading, isReady } = useRRCompany();
  const [range, setRange] = useState({ from: subDays(new Date(), 30), to: new Date(), label: '30 Days' });

  const { data: leads = [] } = useQuery({
    queryKey: ['emergency-leads', companyId],
    queryFn: () => base44.entities.EmergencyLead.filter({ company_id: companyId }, '-created_date', 500),
    enabled: !!companyId,
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ['review-requests', companyId],
    queryFn: () => base44.entities.ReviewRequest.filter({ company_id: companyId }, '-created_date', 500),
    enabled: !!companyId,
  });
  const { data: posts = [] } = useQuery({
    queryKey: ['gbp-posts', companyId],
    queryFn: () => base44.entities.GBPPost.filter({ company_id: companyId }, '-created_date', 500),
    enabled: !!companyId,
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ['rr-campaigns', companyId],
    queryFn: () => base44.entities.RRMarketingCampaign.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });

  const inRange = (d) => {
    if (!d) return false;
    return isWithinInterval(new Date(d), { start: range.from, end: range.to });
  };

  const fLeads    = leads.filter(l => inRange(l.created_date));
  const fReviews  = reviews.filter(r => inRange(r.sent_at || r.created_date));
  const fPosts    = posts.filter(p => inRange(p.created_date));
  const fCampaigns = campaigns.filter(c => inRange(c.created_date));

  const metrics = useMemo(() => {
    const total = fLeads.length;
    const won = fLeads.filter(l => l.status === 'won').length;
    const conv = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';
    const contacted = fLeads.filter(l => l.status !== 'new');
    const avgResp = contacted.length > 0
      ? `${Math.round(contacted.reduce((s, l) => s + differenceInHours(new Date(l.updated_date || 0), new Date(l.created_date || 0)), 0) / contacted.length)}h`
      : 'N/A';
    const received = fReviews.filter(r => r.status === 'reviewed').length;
    const reviewRate = fReviews.length > 0 ? ((received / fReviews.length) * 100).toFixed(1) : '0.0';
    const cityCounts = {};
    fLeads.forEach(l => { if (l.city) cityCounts[l.city] = (cityCounts[l.city] || 0) + 1; });
    const bestCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const svcCounts = {};
    fLeads.forEach(l => { if (l.service_needed) svcCounts[l.service_needed] = (svcCounts[l.service_needed] || 0) + 1; });
    const bestSvc = Object.entries(svcCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    return { total, won, conv, avgResp, reviewRate, bestCity, bestSvc };
  }, [fLeads, fReviews]);

  // Chart data
  const cityData = useMemo(() => {
    const m = {};
    fLeads.forEach(l => { if (l.city) m[l.city] = (m[l.city] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [fLeads]);

  const serviceData = useMemo(() => {
    const m = {};
    fLeads.forEach(l => { if (l.service_needed) m[l.service_needed] = (m[l.service_needed] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [fLeads]);

  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: range.from, end: range.to });
    const step = days.length > 30 ? 7 : 1;
    const buckets = [];
    for (let i = 0; i < days.length; i += step) {
      const d = days[i];
      const nextD = days[Math.min(i + step - 1, days.length - 1)];
      const count = fLeads.filter(l => {
        const ld = new Date(l.created_date || 0);
        return ld >= d && ld <= nextD;
      }).length;
      buckets.push({ name: format(d, step > 1 ? 'MMM d' : 'MMM d'), leads: count });
    }
    return buckets;
  }, [fLeads, range]);

  const COLORS = ['#e05a1c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  const handleExportCSV = () => {
    const rows = [
      ['Customer', 'City', 'Service', 'Urgency', 'Status', 'Date'],
      ...fLeads.map(l => [l.customer_name, l.city, l.service_needed, l.urgency_level, l.status, l.created_date ? format(new Date(l.created_date), 'yyyy-MM-dd') : '']),
    ];
    const csv = rows.map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const METRIC_CARDS = [
    { label: 'Total Leads',       value: metrics.total,         sub: `${metrics.won} won`,              color: '#e05a1c', icon: '📋' },
    { label: 'Conversion Rate',   value: metrics.conv + '%',    sub: 'Lead → Won',                      color: '#10b981', icon: '🎯' },
    { label: 'Avg Response Time', value: metrics.avgResp,       sub: 'New to first contact',             color: '#3b82f6', icon: '⏱️' },
    { label: 'Review Rate',       value: metrics.reviewRate + '%', sub: 'Requests → Received',           color: '#f59e0b', icon: '⭐' },
    { label: 'Best City',         value: metrics.bestCity,      sub: 'Highest lead volume',              color: '#8b5cf6', icon: '📍' },
    { label: 'Best Service',      value: metrics.bestSvc.length > 14 ? metrics.bestSvc.slice(0, 14) + '…' : metrics.bestSvc,
                                                                sub: 'Most requested',                   color: '#06b6d4', icon: '🔧' },
  ];

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-4 md:p-7 max-w-6xl mx-auto space-y-5 md:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={20} style={{ color: '#e05a1c' }} /> Analytics & Reporting
            </h1>
            <p className="text-xs md:text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
              Marketing performance, lead metrics, and growth insights
            </p>
          </div>
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition shrink-0 min-h-[44px]"
            style={{ background: '#1e2d45' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Date filter */}
        <div className="rounded-xl border px-4 py-3" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <DateRangeFilter range={range} onChange={setRange} />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {METRIC_CARDS.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        {/* Charts 2-col */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          <ChartCard title="📈 Lead Volume Trend">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="name" tick={{ fill: '#3a5a7c', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={tipContent} />
                <Line type="monotone" dataKey="leads" stroke="#e05a1c" strokeWidth={2} dot={false} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="📍 Leads by City">
            {cityData.length === 0
              ? <p className="text-center py-10 text-sm" style={{ color: '#3a5a7c' }}>No data in range</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#3a5a7c', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#c8d9eb', fontSize: 10 }} width={80} tickLine={false} />
                    <Tooltip content={tipContent} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartCard>

          <ChartCard title="🔧 Leads by Service">
            {serviceData.length === 0
              ? <p className="text-center py-10 text-sm" style={{ color: '#3a5a7c' }}>No data in range</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={tipContent} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </ChartCard>

          <ChartCard title="⭐ Review Requests Sent">
            {fReviews.length === 0
              ? <p className="text-center py-10 text-sm" style={{ color: '#3a5a7c' }}>No data in range</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: 'Sent', value: fReviews.length },
                    { name: 'Reviewed', value: fReviews.filter(r => r.status === 'reviewed').length },
                    { name: 'Pending', value: fReviews.filter(r => r.status === 'pending').length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis dataKey="name" tick={{ fill: '#c8d9eb', fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={tipContent} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartCard>

          <ChartCard title="🏢 GBP Posts by Status">
            {fPosts.length === 0
              ? <p className="text-center py-10 text-sm" style={{ color: '#3a5a7c' }}>No data in range</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: 'Draft', value: fPosts.filter(p => p.status === 'draft').length },
                    { name: 'Scheduled', value: fPosts.filter(p => p.status === 'scheduled').length },
                    { name: 'Posted', value: fPosts.filter(p => p.status === 'posted').length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis dataKey="name" tick={{ fill: '#c8d9eb', fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={tipContent} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Posts" />
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartCard>

          <ChartCard title="⚡ Campaigns by Type">
            {fCampaigns.length === 0
              ? <p className="text-center py-10 text-sm" style={{ color: '#3a5a7c' }}>No data in range</p>
              : (() => {
                  const m = {};
                  fCampaigns.forEach(c => { const t = c.campaign_type || 'other'; m[t] = (m[t] || 0) + 1; });
                  const data = Object.entries(m).map(([name, value]) => ({ name, value }));
                  return (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                        <XAxis dataKey="name" tick={{ fill: '#c8d9eb', fontSize: 9 }} tickLine={false} />
                        <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={tipContent} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Campaigns">
                          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()
            }
          </ChartCard>

        </div>

        {/* Summary table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
            <p className="text-sm font-bold text-white">Recent Leads</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#e05a1c25', color: '#e05a1c' }}>{fLeads.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr style={{ background: '#0a1020' }}>
                  {['Customer', 'City', 'Service', 'Urgency', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fLeads.slice(0, 20).map((lead) => (
                  <tr key={lead.id} style={{ borderTop: '1px solid #1e2d45' }}>
                    <td className="px-3 md:px-4 py-2.5 text-white font-medium">{lead.customer_name || '—'}</td>
                    <td className="px-3 md:px-4 py-2.5" style={{ color: '#7ba3c8' }}>{lead.city || '—'}</td>
                    <td className="px-3 md:px-4 py-2.5" style={{ color: '#7ba3c8' }}>{lead.service_needed || '—'}</td>
                    <td className="px-3 md:px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{
                        background: lead.urgency_level === 'critical' ? '#ef444420' : lead.urgency_level === 'high' ? '#f59e0b20' : '#3b82f620',
                        color: lead.urgency_level === 'critical' ? '#ef4444' : lead.urgency_level === 'high' ? '#f59e0b' : '#3b82f6',
                      }}>{lead.urgency_level || 'medium'}</span>
                    </td>
                    <td className="px-3 md:px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{
                        background: lead.status === 'won' ? '#10b98120' : lead.status === 'new' ? '#e05a1c20' : '#1e2d45',
                        color: lead.status === 'won' ? '#10b981' : lead.status === 'new' ? '#e05a1c' : '#7ba3c8',
                      }}>{lead.status || 'new'}</span>
                    </td>
                    <td className="px-3 md:px-4 py-2.5 whitespace-nowrap" style={{ color: '#3a5a7c' }}>
                      {lead.created_date ? format(new Date(lead.created_date), 'MMM d') : '—'}
                    </td>
                  </tr>
                ))}
                {fLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center" style={{ color: '#3a5a7c' }}>No leads in this date range</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </RRAccessGate>
  );
}