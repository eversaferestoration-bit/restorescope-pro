import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb,
  BarChart3,
  DollarSign,
  Target,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-blue-100 text-blue-700 border-blue-300',
};

const SUGGESTION_TYPE_COLORS = {
  price_reduction: 'bg-red-50 text-red-700 border-red-200',
  price_increase: 'bg-green-50 text-green-700 border-green-200',
  margin_opportunity: 'bg-blue-50 text-blue-700 border-blue-200',
  alignment_adjustment: 'bg-purple-50 text-purple-700 border-purple-200',
  complexity_adjustment: 'bg-orange-50 text-orange-700 border-orange-200',
  risk_mitigation: 'bg-amber-50 text-amber-700 border-amber-200',
};

const SUGGESTION_ICONS = {
  price_reduction: ArrowDownRight,
  price_increase: ArrowUpRight,
  margin_opportunity: TrendingUp,
  alignment_adjustment: Target,
  complexity_adjustment: Shield,
  risk_mitigation: AlertCircle,
};

function ConfidenceBadge({ confidence }) {
  return (
    <Badge className={cn('text-xs border', CONFIDENCE_COLORS[confidence])}>
      {confidence === 'high' && <CheckCircle size={10} className="inline mr-1" />}
      {confidence === 'medium' && <Info size={10} className="inline mr-1" />}
      {confidence === 'low' && <Lightbulb size={10} className="inline mr-1" />}
      {confidence} confidence
    </Badge>
  );
}

function SuggestionBadge({ type }) {
  const Icon = SUGGESTION_ICONS[type] || Info;
  return (
    <Badge className={cn('text-xs border', SUGGESTION_TYPE_COLORS[type])}>
      <Icon size={10} className="inline mr-1" />
      {type.replace(/_/g, ' ')}
    </Badge>
  );
}

function ItemSuggestionCard({ suggestion, expanded, onToggle }) {
  const hasSuggestions = suggestion.suggestions.length > 0;
  const adjustmentPct = suggestion.adjustment_percentage;
  const isIncrease = adjustmentPct > 0;
  const isDecrease = adjustmentPct < 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="text-left">
            <p className="text-sm font-medium">{suggestion.description}</p>
            <p className="text-xs text-muted-foreground capitalize">{suggestion.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-sm font-semibold">${suggestion.current_unit_cost.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Recommended</p>
            <p className={cn('text-sm font-semibold', 
              isIncrease ? 'text-green-600' : 
              isDecrease ? 'text-red-600' : 
              'text-muted-foreground'
            )}>
              ${suggestion.recommended_unit_cost.toFixed(2)}
            </p>
          </div>
          <div className="w-16 text-right">
            {isIncrease ? (
              <ArrowUpRight size={16} className="text-green-600 ml-auto" />
            ) : isDecrease ? (
              <ArrowDownRight size={16} className="text-red-600 ml-auto" />
            ) : (
              <Minus size={16} className="text-muted-foreground ml-auto" />
            )}
          </div>
          <ConfidenceBadge confidence={suggestion.confidence} />
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && hasSuggestions && (
        <div className="px-4 py-3 bg-muted/20 space-y-3 border-t border-border">
          {/* Suggestions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Recommendations:</p>
            {suggestion.suggestions.map((sg, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <SuggestionBadge type={sg.type} />
                  <span className="text-xs font-medium">{sg.priority === 'high' ? '⚠ High Priority' : sg.priority === 'medium' ? '📋 Medium Priority' : '💡 Low Priority'}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{sg.description}</p>
                <p className="text-xs text-muted-foreground"><span className="font-medium">Action:</span> {sg.recommended_action}</p>
                <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Impact:</span> {sg.impact}</p>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground">Analysis:</p>
            {suggestion.reasoning.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info size={10} className="mt-0.5 shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && !hasSuggestions && (
        <div className="px-4 py-3 bg-muted/20 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle size={12} className="text-green-600" />
            <span>No pricing adjustments recommended. Current pricing is appropriate.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, subtext, icon: Icon, color = 'text-primary' }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

export default function SmartPricingPanel({ estimateId }) {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'estimator';
  const [expandedItems, setExpandedItems] = useState({});
  const [analyzing, setAnalyzing] = useState(false);

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['smart-pricing', estimateId],
    queryFn: () => base44.functions.invoke('getSmartPricingSuggestions', {
      estimate_version_id: estimateId,
    }),
    enabled: false,
    retry: 1,
  });

  const handleAnalyze = () => {
    setAnalyzing(true);
    refetch().finally(() => setAnalyzing(false));
  };

  const toggleItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (!isManager) {
    return (
      <div className="bg-muted/30 rounded-xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">Smart pricing is available for estimators, managers, and admins only.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">Failed to analyze pricing</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  if (!analysis && !isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          <h3 className="text-sm font-semibold">Smart Pricing Intelligence</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Get AI-powered pricing recommendations based on market benchmarks, historical approvals, and job complexity.
        </p>

        <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Target size={12} className="text-primary" />
            <span>Market benchmarks</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-primary" />
            <span>Historical data</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-primary" />
            <span>Job complexity</span>
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full"
        >
          {analyzing ? (
            <>
              <Loader2 size={14} className="animate-spin mr-2" />
              Analyzing Pricing…
            </>
          ) : (
            <>
              <BarChart3 size={14} className="mr-2" />
              Analyze Pricing
            </>
          )}
        </Button>
      </div>
    );
  }

  if (isLoading || analyzing) {
    return (
      <div className="rounded-xl border border-border p-8 text-center">
        <Loader2 size={32} className="mx-auto text-primary animate-spin mb-3" />
        <p className="text-sm font-medium">Analyzing pricing against benchmarks and historical data…</p>
        <p className="text-xs text-muted-foreground mt-1">This may take 10–15 seconds</p>
      </div>
    );
  }

  const { current_estimate, recommendations, summary, suggestions_by_item, pricing_profile_constraints } = analysis.data;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryStat
          icon={DollarSign}
          label="Current Total"
          value={`$${current_estimate.total.toLocaleString()}`}
          subtext={`${current_estimate.line_items_count} line items`}
          color="text-blue-600"
        />
        <SummaryStat
          icon={Target}
          label="Recommended Total"
          value={`$${Math.round(recommendations.total).toLocaleString()}`}
          subtext={recommendations.adjustment > 0 ? 'Increase suggested' : recommendations.adjustment < 0 ? 'Decrease suggested' : 'No change'}
          color={recommendations.adjustment > 0 ? 'text-green-600' : recommendations.adjustment < 0 ? 'text-red-600' : 'text-muted-foreground'}
        />
        <SummaryStat
          icon={BarChart3}
          label="Items Analyzed"
          value={summary.total_items_analyzed}
          subtext={`${summary.items_with_suggestions} with suggestions`}
          color="text-primary"
        />
        <SummaryStat
          icon={CheckCircle}
          label="High Confidence"
          value={summary.high_confidence_suggestions}
          subtext="Actionable recommendations"
          color="text-green-600"
        />
      </div>

      {/* Adjustment Summary */}
      {recommendations.adjustment !== 0 && (
        <Card className={cn('border-2', 
          recommendations.adjustment > 0 ? 'border-green-300 bg-green-50' : 
          recommendations.adjustment < 0 ? 'border-red-300 bg-red-50' : 
          'border-border'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {recommendations.adjustment > 0 ? (
                  <ArrowUpRight size={20} className="text-green-600" />
                ) : recommendations.adjustment < 0 ? (
                  <ArrowDownRight size={20} className="text-red-600" />
                ) : (
                  <Minus size={20} className="text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {recommendations.adjustment > 0 ? 'Increase Recommended' : 
                     recommendations.adjustment < 0 ? 'Decrease Recommended' : 
                     'No Changes Recommended'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.abs(recommendations.adjustment_percentage).toFixed(1)}% adjustment 
                    (${Math.abs(recommendations.adjustment).toLocaleString()})
                  </p>
                </div>
              </div>
              {pricing_profile_constraints && (
                <Badge variant="outline" className="text-xs">
                  {pricing_profile_constraints.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestion Type Breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb size={14} className="text-muted-foreground" />
            Suggestion Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-700">{summary.by_type.reductions}</p>
              <p className="text-xs text-red-700">Price Reductions</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-2xl font-bold text-green-700">{summary.by_type.increases}</p>
              <p className="text-xs text-green-700">Price Increases</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">{summary.by_type.alignments}</p>
              <p className="text-xs text-purple-700">Alignments</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-2xl font-bold text-amber-700">{summary.by_type.risk_mitigation}</p>
              <p className="text-xs text-amber-700">Risk Mitigation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Item Suggestions */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 size={14} className="text-muted-foreground" />
          Line Item Analysis
        </h4>
        
        <div className="space-y-2">
          {suggestions_by_item.map((item, idx) => (
            <ItemSuggestionCard
              key={item.scope_item_id || idx}
              suggestion={item}
              expanded={!!expandedItems[item.scope_item_id]}
              onToggle={() => toggleItem(item.scope_item_id)}
            />
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold mb-1">Pricing Intelligence Note</p>
            <p>These are recommendations only. No prices are automatically changed. Review each suggestion and manually adjust pricing as appropriate based on your professional judgment and specific job circumstances.</p>
          </div>
        </div>
      </div>
    </div>
  );
}