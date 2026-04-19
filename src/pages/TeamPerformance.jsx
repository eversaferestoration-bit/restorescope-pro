import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp, Target, Zap, Clock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MetricCard = ({ icon: Icon, label, value, unit, trend, color }) => (
  <Card className="border-border">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {unit && <p className="text-xs text-muted-foreground mt-0.5">{unit}</p>}
        </div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      {trend && (
        <p className={cn('text-xs mt-2 font-medium', trend > 0 ? 'text-green-600' : 'text-red-600')}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
        </p>
      )}
    </CardContent>
  </Card>
);

const UserRow = ({ user, metrics }) => {
  const getScoreColor = (value) => {
    if (value >= 85) return 'text-green-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (value) => {
    if (value >= 85) return 'bg-green-100 text-green-700';
    if (value >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3 hover:shadow-lg transition">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm">{user.user_name || user.user_email}</h3>
          <p className="text-xs text-muted-foreground">{user.user_email}</p>
        </div>
        <Badge className="bg-primary/10 text-primary">{user.estimates_created} estimates</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground mb-1">Estimate Accuracy</p>
          <p className={cn('text-lg font-bold', getScoreColor(user.estimate_accuracy_percent))}>
            {user.estimate_accuracy_percent}%
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground mb-1">Approval Rate</p>
          <p className={cn('text-lg font-bold', getScoreColor(user.approval_rate_percent))}>
            {user.approval_rate_percent}%
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground mb-1">Supplement Success</p>
          <p className={cn('text-lg font-bold', getScoreColor(user.supplement_success_percent))}>
            {user.supplement_success_percent}%
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground mb-1">Avg Turnaround</p>
          <p className="text-lg font-bold">{user.avg_turnaround_hours}h</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Total Estimate Value</p>
          <p className="text-sm font-semibold">${user.total_estimate_value.toLocaleString()}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Avg per Estimate</p>
          <p className="text-sm font-semibold">${user.avg_estimate_value.toLocaleString()}</p>
        </div>
      </div>

      {user.supplements_filed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-900">
            <span className="font-semibold">{user.supplements_approved}/{user.supplements_filed}</span> supplements approved
          </p>
        </div>
      )}
    </div>
  );
};

export default function TeamPerformance() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(30);

  const { data: metricsRes, isLoading, error } = useQuery({
    queryKey: ['team-metrics', period],
    queryFn: () => base44.functions.invoke('calculateTeamMetrics', { period_days: period }),
    enabled: user?.role === 'admin' || user?.role === 'manager',
    retry: 1,
  });

  const metrics = metricsRes?.data?.metrics || [];

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold">Manager access required</p>
            <p className="text-sm text-muted-foreground mt-1">Team Performance is available to managers and admins.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const companyMetrics = metrics.length > 0 ? {
    avgAccuracy: metrics.reduce((sum, m) => sum + m.estimate_accuracy_percent, 0) / metrics.length,
    avgApproval: metrics.reduce((sum, m) => sum + m.approval_rate_percent, 0) / metrics.length,
    avgSupplement: metrics.reduce((sum, m) => sum + m.supplement_success_percent, 0) / metrics.length,
    avgTurnaround: metrics.reduce((sum, m) => sum + m.avg_turnaround_hours, 0) / metrics.length,
    totalValue: metrics.reduce((sum, m) => sum + m.total_estimate_value, 0),
  } : {};

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <TrendingUp size={24} className="text-primary" />
          Team Performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Track estimate accuracy, approval rates, and team productivity</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setPeriod(days)}
            className={cn(
              'px-4 h-9 rounded-lg text-sm font-medium transition',
              period === days
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:bg-muted'
            )}
          >
            Last {days} days
          </button>
        ))}
      </div>

      {/* Company-wide metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : metrics.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard
            icon={Target}
            label="Avg Accuracy"
            value={`${Math.round(companyMetrics.avgAccuracy)}%`}
            color="bg-blue-600"
          />
          <MetricCard
            icon={Zap}
            label="Avg Approval"
            value={`${Math.round(companyMetrics.avgApproval)}%`}
            color="bg-green-600"
          />
          <MetricCard
            icon={Award}
            label="Supplement Success"
            value={`${Math.round(companyMetrics.avgSupplement)}%`}
            color="bg-purple-600"
          />
          <MetricCard
            icon={Clock}
            label="Avg Turnaround"
            value={`${Math.round(companyMetrics.avgTurnaround)}h`}
            color="bg-amber-600"
          />
          <MetricCard
            icon={TrendingUp}
            label="Total Value"
            value={`$${(companyMetrics.totalValue / 1000).toFixed(0)}k`}
            unit="all estimates"
            color="bg-indigo-600"
          />
        </div>
      ) : null}

      {/* Team leaderboard */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Award size={14} className="text-primary" />
          Team Members
        </h2>
        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : metrics.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No performance data available for this period</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {metrics.map((metric) => (
              <UserRow key={metric.user_email} user={metric} metrics={metric} />
            ))}
          </div>
        )}
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">Failed to load metrics. Please try again.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}