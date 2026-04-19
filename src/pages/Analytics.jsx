import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle, 
  FileText, 
  Clock, 
  AlertTriangle,
  Shield,
  BarChart3,
  Calendar,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
};

function MetricCard({ title, value, subtext, trend, icon: Icon, color }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : null;
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground';
  
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon size={16} className={color} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {TrendIcon && <TrendIcon size={12} className={trendColor} />}
          <p className={`text-xs ${trendColor}`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}% from last week
          </p>
        </div>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function TrendChart({ data, dataKey, color, title, yLabel }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                fontSize={12} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                fontSize={12} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function JobStatusPieChart({ data }) {
  const pieData = Object.entries(data).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  })).filter(d => d.value > 0);

  if (pieData.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Job Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No jobs in this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Job Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          {pieData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => base44.functions.invoke('getAnalyticsData', { time_range: timeRange }),
    enabled: user?.role === 'admin' || user?.role === 'manager',
    retry: 1,
  });

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-border">
            <CardContent className="p-10 text-center">
              <BarChart3 size={48} className="mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Analytics Access Restricted</h2>
              <p className="text-sm text-muted-foreground">
                Analytics dashboard is available for managers and admins only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Loading analytics…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="p-10 text-center">
              <AlertTriangle size={48} className="mx-auto text-destructive mb-4" />
              <h2 className="text-lg font-semibold text-destructive mb-2">Failed to Load Analytics</h2>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <Button onClick={() => refetch()} className="mt-4">Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { metrics, trends, breakdown } = analytics.data;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <BarChart3 size={24} className="text-primary" />
              Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Company performance metrics and trends
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button variant="outline" size="sm" className="gap-2">
              <Download size={14} /> Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Average Job Value"
            value={`$${metrics.avg_job_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtext={`${breakdown.total_estimates} estimates analyzed`}
            trend={metrics.profit_trend_percentage}
            icon={DollarSign}
            color="text-green-600"
          />
          
          <MetricCard
            title="Approval Rate"
            value={`${metrics.approval_rate.toFixed(1)}%`}
            subtext={`${breakdown.total_estimates} estimates submitted`}
            trend={0}
            icon={CheckCircle}
            color="text-blue-600"
          />
          
          <MetricCard
            title="Supplement Success Rate"
            value={`${metrics.supplement_success_rate.toFixed(1)}%`}
            subtext={`${breakdown.total_supplements} supplements filed`}
            trend={0}
            icon={FileText}
            color="text-purple-600"
          />
          
          <MetricCard
            title="Avg Turnaround Time"
            value={`${metrics.avg_turnaround_days.toFixed(1)} days`}
            subtext="From job creation to approval"
            trend={0}
            icon={Clock}
            color="text-amber-600"
          />
          
          <MetricCard
            title="Profit Trend"
            value={`${metrics.profit_trend_percentage >= 0 ? '+' : ''}${metrics.profit_trend_percentage.toFixed(1)}%`}
            subtext="Week over week"
            trend={metrics.profit_trend_percentage}
            icon={TrendingUp}
            color={metrics.profit_trend_percentage >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          
          <MetricCard
            title="Risk Score Trend"
            value={`${metrics.risk_score_trend >= 0 ? '+' : ''}${metrics.risk_score_trend.toFixed(1)}`}
            subtext="Lower is better (0-100 scale)"
            trend={-metrics.risk_score_trend}
            icon={Shield}
            color={metrics.risk_score_trend <= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart
            data={trends.profit}
            dataKey="value"
            color="hsl(var(--chart-1))"
            title="Profit Trend (Weekly)"
            yLabel="Revenue ($)"
          />
          
          <TrendChart
            data={trends.risk}
            dataKey="risk_score"
            color="hsl(var(--chart-5))"
            title="Risk Score Trend (Weekly)"
            yLabel="Risk Score (0-100)"
          />
          
          <JobStatusPieChart data={breakdown.job_status} />
          
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Summary Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Jobs</p>
                  <p className="text-lg font-semibold">{breakdown.total_jobs}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Estimates</p>
                  <p className="text-lg font-semibold">{breakdown.total_estimates}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Supplements</p>
                  <p className="text-lg font-semibold">{breakdown.total_supplements}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-lg font-semibold">{analytics.data.period.days} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Privacy Notice */}
        <div className="bg-muted/30 rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-primary mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary">Data Privacy & Security</p>
              <p className="text-xs text-muted-foreground mt-1">
                All metrics shown are from your company's data only. Benchmark overlays (if enabled) use anonymous aggregated data from all companies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}