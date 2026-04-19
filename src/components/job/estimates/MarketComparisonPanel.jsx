import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Loader2, BarChart3, DollarSign, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ASSESSMENT_COLORS = {
  underpriced: 'bg-red-100 text-red-700 border-red-300',
  high_value: 'bg-green-100 text-green-700 border-green-300',
  market_aligned: 'bg-blue-100 text-blue-700 border-blue-300',
};

const ASSESSMENT_ICONS = {
  underpriced: TrendingDown,
  high_value: TrendingUp,
  market_aligned: Minus,
};

const PRICING_INDICATOR_COLORS = {
  underpriced: 'text-red-600 bg-red-50',
  high_value: 'text-green-600 bg-green-50',
  market: 'text-blue-600 bg-blue-50',
};

function PercentileGauge({ percentile }) {
  if (percentile === null) return null;

  const rotation = (percentile / 100) * 180 - 90;
  
  return (
    <div className="relative w-32 h-16 mx-auto mb-2">
      <div className="absolute bottom-0 left-0 right-0 h-16 rounded-t-full border-8 border-muted" />
      <div 
        className={cn(
          'absolute bottom-0 left-0 right-0 h-16 rounded-t-full border-8 transition-all',
          percentile < 30 ? 'border-red-500' : percentile > 70 ? 'border-green-500' : 'border-blue-500'
        )}
        style={{ clipPath: `inset(0 ${100 - percentile}% 0 0)` }}
      />
      <div 
        className="absolute bottom-0 left-1/2 w-1 h-12 -ml-0.5 origin-bottom transition-transform"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className={cn(
          'w-3 h-3 rounded-full -ml-1 -mt-1',
          percentile < 30 ? 'bg-red-500' : percentile > 70 ? 'bg-green-500' : 'bg-blue-500'
        )} />
      </div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold">
        {percentile}{percentile !== null ? 'th' : ''}
      </div>
    </div>
  );
}

function LineItemAnalysisRow({ item }) {
  const IndicatorIcon = ASSESSMENT_ICONS[item.pricing_indicator] || Minus;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{item.category}</span>
          <Badge className={cn('text-xs', PRICING_INDICATOR_COLORS[item.pricing_indicator])}>
            <IndicatorIcon size={10} className="inline mr-1" />
            {item.pricing_indicator.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          ${item.avg_unit_cost?.toFixed(2)} vs market ${item.market_avg?.toFixed(2)}
          {item.variance_pct !== 0 && (
            <span className={cn('ml-1', item.variance_pct < 0 ? 'text-red-600' : 'text-green-600')}>
              ({item.variance_pct > 0 ? '+' : ''}{item.variance_pct.toFixed(0)}%)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function MarketComparisonPanel({ estimateId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showDetails, setShowDetails] = useState(false);
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const { data: comparison, isLoading, error, refetch } = useQuery({
    queryKey: ['benchmark-comparison', estimateId],
    queryFn: () => base44.functions.invoke('getBenchmarkComparison', { estimate_version_id: estimateId }),
    enabled: !!estimateId && isManager,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('updateBenchmarks', {}),
    onSuccess: () => {
      qc.invalidateQueries(['benchmark-comparison', estimateId]);
      refetch();
    },
  });

  if (!isManager) {
    return (
      <div className="bg-muted/30 rounded-xl border border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">Market comparison is available for managers and admins only.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <Loader2 size={24} className="mx-auto text-muted-foreground animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Analyzing estimate against market benchmarks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle size={16} />
          <p className="text-sm font-medium">Failed to load market comparison</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (!comparison?.data) {
    return (
      <div className="bg-muted/30 rounded-xl border border-border p-6 text-center">
        <BarChart3 size={32} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-semibold">No benchmark data available</p>
        <p className="text-xs text-muted-foreground mt-1">
          Market comparison requires approved estimates in the same region and loss type.
        </p>
        {user.role === 'admin' && (
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="mt-3 h-8 text-xs"
          >
            {updateMutation.isPending ? 'Updating…' : 'Update Benchmarks'}
          </Button>
        )}
      </div>
    );
  }

  const { market_comparison, line_item_analysis, scope_analysis, benchmarks_used } = comparison.data;
  const AssessmentIcon = ASSESSMENT_ICONS[market_comparison.overall_assessment] || Minus;

  return (
    <div className="space-y-4">
      {/* Overall Assessment */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 size={14} className="text-primary" />
            Market Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Percentile Gauge */}
          <div className="text-center">
            <PercentileGauge percentile={market_comparison.total_percentile} />
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge className={cn('text-xs', ASSESSMENT_COLORS[market_comparison.overall_assessment])}>
                <AssessmentIcon size={10} className="inline mr-1" />
                {market_comparison.overall_assessment.replace('_', ' ')}
              </Badge>
              {market_comparison.sample_size > 0 && (
                <span className="text-xs text-muted-foreground">
                  Based on {market_comparison.sample_size} comparable estimates
                </span>
              )}
            </div>
          </div>

          {/* Assessment Details */}
          {market_comparison.assessment_details.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              {market_comparison.assessment_details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <AlertCircle size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign size={11} />
                <span>Market Avg</span>
              </div>
              <p className="text-sm font-semibold">
                ${benchmarks_used.total_benchmark?.avg?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Layers size={11} />
                <span>Scope Count</span>
              </div>
              <p className="text-sm font-semibold">
                {scope_analysis.scope_count} items
                {scope_analysis.variance_pct !== 0 && (
                  <span className={cn('text-xs ml-1', scope_analysis.variance_pct < 0 ? 'text-red-600' : 'text-green-600')}>
                    ({scope_analysis.variance_pct > 0 ? '+' : ''}{scope_analysis.variance_pct.toFixed(0)}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Expand Details */}
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full h-8 text-xs"
          >
            {showDetails ? 'Hide Details' : 'Show Line Item Analysis'}
          </Button>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      {showDetails && line_item_analysis.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Line Item Analysis by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {line_item_analysis.map((item, idx) => (
                <LineItemAnalysisRow key={idx} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: Update Benchmarks */}
      {user.role === 'admin' && (
        <div className="text-center pt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="h-8 text-xs"
          >
            {updateMutation.isPending ? (
              <Loader2 size={12} className="animate-spin inline mr-1" />
            ) : (
              <BarChart3 size={12} className="inline mr-1" />
            )}
            {updateMutation.isPending ? 'Updating Benchmarks…' : 'Update Market Benchmarks'}
          </Button>
        </div>
      )}
    </div>
  );
}