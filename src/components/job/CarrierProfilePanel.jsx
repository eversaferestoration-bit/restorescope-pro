import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2, TrendingUp, TrendingDown, AlertTriangle, FileText, Clock, CheckCircle, BarChart3, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DIFFICULTY_COLORS = {
  favorable: 'bg-green-100 text-green-700 border-green-300',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  challenging: 'bg-red-100 text-red-700 border-red-300',
};

const RESPONSE_COLORS = {
  fast: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  slow: 'bg-red-100 text-red-700',
  variable: 'bg-gray-100 text-gray-700',
};

export default function CarrierProfilePanel({ carrierId, carrierName }) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const { data: strategy, isLoading, refetch } = useQuery({
    queryKey: ['carrier-strategy', carrierName],
    queryFn: () => base44.functions.invoke('getCarrierStrategy', { carrier_name: carrierName }),
    enabled: !!carrierName,
    retry: 1,
  });

  const handleRefresh = async () => {
    if (!carrierId) return;
    setRefreshing(true);
    try {
      await base44.functions.invoke('updateCarrierProfile', { carrier_id: carrierId });
      await refetch();
    } catch (error) {
      console.error('Failed to refresh carrier profile:', error);
    }
    setRefreshing(false);
  };

  if (!carrierName) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No carrier assigned to this job.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading carrier intelligence…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!strategy?.data) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Unable to load carrier profile.
        </CardContent>
      </Card>
    );
  }

  const { 
    has_profile, 
    difficulty_level, 
    difficulty_score,
    profile_summary,
    recommendations 
  } = strategy.data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          <h3 className="text-sm font-semibold font-display">Carrier Intelligence</h3>
          <span className="text-xs text-muted-foreground">({carrierName})</span>
        </div>
        {isManager && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 text-xs"
          >
            <RefreshCw size={12} className={cn('mr-1', refreshing && 'animate-spin')} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </Button>
        )}
      </div>

      {/* Difficulty Badge */}
      <div className="flex items-center gap-2">
        <Badge className={cn('text-xs border', DIFFICULTY_COLORS[difficulty_level] || DIFFICULTY_COLORS.moderate)}>
          <BarChart3 size={10} className="inline mr-1" />
          {difficulty_level === 'favorable' ? 'Favorable Carrier' : difficulty_level === 'challenging' ? 'Challenging Carrier' : 'Moderate'}
        </Badge>
        {has_profile && profile_summary && (
          <Badge variant="outline" className="text-xs">
            {profile_summary.total_interactions} interactions
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      {has_profile && profile_summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-green-600">{profile_summary.avg_approval_rate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-0.5">Approval Rate</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-amber-600">{profile_summary.avg_reduction_percent.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-0.5">Avg Reduction</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <Badge className={cn('text-xs', RESPONSE_COLORS[profile_summary.response_behavior] || RESPONSE_COLORS.moderate)}>
                <Clock size={10} className="inline mr-1" />
                {profile_summary.response_behavior}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Response Time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documentation Emphasis */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <FileText size={12} className="text-blue-600" />
            Documentation Emphasis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {recommendations.documentation_emphasis.map((doc, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <CheckCircle size={10} className="text-green-600 mt-0.5 shrink-0" />
                {doc}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Risk Areas */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-600" />
            Risk Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {recommendations.risk_areas.map((risk, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <AlertTriangle size={10} className="text-amber-600 mt-0.5 shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Strategy Suggestions */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Shield size={12} className="text-primary" />
            Recommended Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {recommendations.strategy_suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <TrendingUp size={10} className="text-primary mt-0.5 shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {!has_profile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-700">
            💡 No historical data available. Submit claims to build carrier intelligence profile.
          </p>
        </div>
      )}
    </div>
  );
}