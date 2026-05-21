/* eslint-disable react/display-name */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import {
  BarChart2, TrendingUp, Star, Phone, CloudLightning, FileText,
  Download, Calendar
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d1829', border: '1px solid #1e2d45', borderRadius: 10, fontSize: 12 },
  labelStyle: { color: '#c8d9eb' },
  itemStyle: { color: '#7ba3c8' },
};

const DATE_RANGES = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

function StatCard({ label, value, sub, color, icon: IconComp }) {
  return (
    <div className="rounded-xl border p-4 md:p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '25' }}>
          <IconComp size={15} style={{ color }} />
        </div>
        <p className="text-xs font-semibold" style={{ color: '#7ba3c8' }}>{label}</p>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-4 md:px-5 py-3.5 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <p className="text-sm font-bold text-white">{title}</p>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
}

function buildDailySeries(items, days, dateField = 'created_date') {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);
  const interval = eachDayOfInterval({ start, end });
  return interval.map(d => {
    const key = format(d, 'MMM d');
    const count = items.filter(i => {
      const dt = new Date(i[dateField] || 0);
      return format(dt, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
    }).length;
    return { date: key, count };
  });
}

export default function RRAnalytics() {
  const { companyId, profileLoading, isReady } = useRRCompany();
  const [range, setRange] = useState(30);

  const { data: leads = [] } = useQuery({
    queryKey: ['emergency-leads', companyId],
    queryFn: () => base44.entities.EmergencyLead.filter({ company_id: companyId }, '-created_date', 500),
    enabled: !!companyId,
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ['rr-campaigns', companyId],
    queryFn: () => base44.entities.RRMarketingCampaign.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ['review-requests', companyId],
    queryFn: () => base44.entities.ReviewRequest.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });
  const { data: gbpPosts = [] } = useQuery({
    queryKey: ['gbp-posts', companyId],
    queryFn: () => base44.entities.GBPPost.filter({ company_id: companyId }, '-created_date', 200),
    enabled: !!companyId,
  });
  const { data: storms = [] } = useQuery({
    queryKey: ['storm-events', companyId],
    queryFn: () => base44.entities.StormEvent.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  // KPI totals
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'won').length;
  const convRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const reviewCount = reviews.filter(r => r.status === 'reviewed').length;
  const postsCount = gbpPosts.length;
  const campaignCount = campaigns.length;
  const stormCount = storms.length;

  // Time series
  const leadSeries = buildDailySeries(leads, range);
  const reviewSeries = buildDailySeries(reviews, range);

  // Campaign type breakdown
  const campaignTypeMap = {};
  campaigns.forEach(c => {
    campaignTypeMap[c.campaign_type] = (campaignTypeMap[c.campaign_type] || 0) + 1;
  });
  const campaignPieData = Object.entries(campaignTypeMap).map(([name, value], i) => ({
    name: name.replace('_', ' '),
    value,
    color: ['#e05a1c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 6],
  }));

  // Lead source breakdown
  const sourceMap = {};
  leads.forEach(l => {
    const src = l.service_needed || 'Other';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count], i) => ({
      name: name.length > 18 ? name.slice(0, 16) + '…' : name,
      count,
      color: ['#e05a1c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'][i % 6],
    }));

  // Storm events by severity
  const severityMap = {};
  storms.forEach(s => { severityMap[s.severity || 'unknown'] = (severityMap[s.severity || 'unknown'] || 0) + 1; });
  const stormSeverityData = Object.entries(severityMap).map(([name, value], i) => ({
    name, value,
    color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i % 4],
  }));

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-4 md:p-7 max-w-7xl mx-auto space-y-5 md:space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={20} style={{ color: '#e05a1c' }} /> Analytics & Reporting
            </h1>
            <p className="text-xs md:text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
              Track leads, campaigns, reviews, and marketing performance
            </p>
          </div>
          {/* Date range */}
          <div className="flex items-center gap-1 p-1 rounded-xl border shrink-0" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
            {DATE_RANGES.map(r => (
              <button key={r.days} onClick={() => setRange(r.days)}
                className="text-xs px-3 py-2 rounded-lg font-semibold transition min-h-[36px]"
                style={range === r.days
                  ? { background: '#e05a1c', color: '#fff' }
                  : { color: '#7ba3c8' }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Total Leads" value={totalLeads} sub="All time" color="#e05a1c" icon={Phone} />
          <StatCard label="Conversion" value={`${convRate}%`} sub={`${convertedLeads} won`} color="#10b981" icon={TrendingUp} />
          <StatCard label="Reviews" value={reviewCount} sub="Received" color="#f59e0b" icon={Star} />
          <StatCard label="GBP Posts" value={postsCount} sub="Created" color="#3b82f6" icon={FileText} />
          <StatCard label="Campaigns" value={campaignCount} sub="All types" color="#8b5cf6" icon={BarChart2} />
          <StatCard label="Storm Events" value={stormCount} sub="Logged" color="#ef4444" icon={CloudLightning} />
        </div>

        {/* Lead Trend + Review Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <ChartCard title={`Lead Trend (Last ${range} Days)`}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={leadSeries} margin={{ top: 0, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="date" tick={{ fill: '#3a5a7c', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.floor(leadSeries.length / 5)} />
                <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Leads']} />
                <Line type="monotone" dataKey="count" stroke="#e05a1c" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={`Review Requests (Last ${range} Days)`}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={reviewSeries} margin={{ top: 0, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="date" tick={{ fill: '#3a5a7c', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.floor(reviewSeries.length / 5)} />
                <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Requests']} />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Lead by Service + Campaign Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <ChartCard title="Leads by Service Type">
            {sourceData.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#3a5a7c' }}>No lead data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <XAxis type="number" tick={{ fill: '#3a5a7c', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#7ba3c8', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Leads']} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Campaign Type Breakdown">
            {campaignPieData.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#3a5a7c' }}>No campaigns yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={campaignPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false} fontSize={10} fill="#8884d8">
                    {campaignPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Storm Severity breakdown */}
        {stormSeverityData.length > 0 && (
          <ChartCard title="Storm Events by Severity">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stormSeverityData} margin={{ top: 0, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: '#7ba3c8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#3a5a7c', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Events']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stormSeverityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Review status breakdown */}
        <ChartCard title="Review Request Status">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pending',     count: reviews.filter(r => r.status === 'pending').length,     color: '#f59e0b', bg: '#f59e0b20' },
              { label: 'Sent',        count: reviews.filter(r => r.status === 'sent').length,        color: '#3b82f6', bg: '#3b82f620' },
              { label: 'Reviewed',    count: reviews.filter(r => r.status === 'reviewed').length,    color: '#10b981', bg: '#10b98120' },
              { label: 'No Response', count: reviews.filter(r => r.status === 'no_response').length, color: '#3a5a7c', bg: '#1e2d4580' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                <p className="text-xl md:text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-xs mt-0.5" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>

      </div>
    </RRAccessGate>
  );
}