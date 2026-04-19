import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import UpgradePrompt from '@/components/UpgradePrompt';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Shield, 
  Clock, 
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  FileText,
  Camera,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-red-100 text-red-700 border-red-300',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const APPROVAL_COLORS = {
  lenient: 'text-green-600',
  moderate: 'text-yellow-600',
  strict: 'text-red-600',
  unknown: 'text-muted-foreground',
};

const STRATEGY_ICONS = {
  defensive: Shield,
  balanced: Target,
  collaborative: MessageSquare,
  standard: FileText,
};

const TIP_ICONS = {
  document: FileText,
  photo: Camera,
  justify: BarChart3,
  respond: Clock,
  followup: MessageSquare,
  default: CheckCircle,
};

function getTipIcon(tip) {
  const lower = tip.toLowerCase();
  if (lower.includes('document') || lower.includes('justify')) return TIP_ICONS.document;
  if (lower.includes('photo')) return TIP_ICONS.photo;
  if (lower.includes('respond') || lower.includes('quick')) return TIP_ICONS.respond;
  if (lower.includes('follow')) return TIP_ICONS.followup;
  if (lower.includes('break') || lower.includes('item')) return TIP_ICONS.layers;
  return TIP_ICONS.default;
}

function RiskBadge({ level }) {
  const icons = {
    low: CheckCircle,
    medium: AlertTriangle,
    high: AlertCircle,
    unknown: AlertCircle,
  };
  const Icon = icons[level] || icons.unknown;
  
  return (
    <Badge className={cn('text-xs border', RISK_COLORS[level] || RISK_COLORS.unknown)}>
      <Icon size={10} className="inline mr-1" />
      {level === 'unknown' ? 'Unknown' : `${level} risk`}
    </Badge>
  );
}

function StatRow({ icon: Icon, label, value, subtext }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
        <Icon size={14} className="text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

export default function AdjusterInsightsPanel({ adjusterId }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const { data: insights, isLoading, error } = useQuery({
    queryKey: ['adjuster-insights', adjusterId],
    queryFn: () => base44.functions.invoke('getAdjusterInsights', { adjuster_id: adjusterId }),
    enabled: !!adjusterId && isManager,
    retry: 1,
  });

  if (!isManager) {
    return (
      <button 
        onClick={() => setShowUpgrade(true)}
        className="w-full text-left p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-purple-600" />
          <span className="text-sm font-semibold">Adjuster Intelligence</span>
        </div>
        <p className="text-xs text-muted-foreground">Upgrade to Business for adjuster insights and negotiation strategies</p>
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading adjuster insights…</p>
      </div>
    );
  }

  if (error || !insights?.data) {
    return (
      <button 
        onClick={() => setShowUpgrade(true)}
        className="w-full text-left p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-purple-600" />
          <span className="text-sm font-semibold">Adjuster Intelligence</span>
        </div>
        <p className="text-xs text-muted-foreground">Unlock adjuster insights and negotiation strategies</p>
      </button>
    );
  }

  if (!insights?.data) {
    return (
      <div className="bg-muted/30 rounded-xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No adjuster data available</p>
      </div>
    );
  }

  const { 
    adjuster_name, 
    has_historical_data, 
    approval_tendencies, 
    negotiation_risk, 
    suggested_strategy,
    common_rejected_categories,
    avg_response_time_days,
    insights_summary
  } = insights.data;

  const StrategyIcon = STRATEGY_ICONS[suggested_strategy.approach] || STRATEGY_ICONS.standard;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 size={14} className="text-primary" />
            Adjuster Insights
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{adjuster_name}</p>
        </div>
        <RiskBadge level={negotiation_risk.level} />
      </div>

      {/* Summary */}
      {insights_summary && (
        <div className="bg-muted/30 rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">{insights_summary}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border">
          <CardContent className="p-3">
            <StatRow 
              icon={TrendingUp}
              label="Approval Rate"
              value={approval_tendencies.approval_rate ? `${approval_tendencies.approval_rate.toFixed(1)}%` : 'N/A'}
              subtext={approval_tendencies.assessment !== 'unknown' ? approval_tendencies.assessment : undefined}
            />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <StatRow 
              icon={TrendingDown}
              label="Avg Reduction"
              value={negotiation_risk.avg_reduction_percent ? `${negotiation_risk.avg_reduction_percent.toFixed(1)}%` : '0%'}
              subtext={negotiation_risk.avg_reduction_percent > 0 ? 'per interaction' : undefined}
            />
          </CardContent>
        </Card>

        {avg_response_time_days && (
          <Card className="border-border">
            <CardContent className="p-3">
              <StatRow 
                icon={Clock}
                label="Response Time"
                value={`${avg_response_time_days.toFixed(1)} days`}
                subtext="average"
              />
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardContent className="p-3">
            <StatRow 
              icon={Layers}
              label="Interactions"
              value={approval_tendencies.total_interactions}
              subtext="total estimates"
            />
          </CardContent>
        </Card>
      </div>

      {/* Common Rejections */}
      {common_rejected_categories?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Commonly Rejected Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {common_rejected_categories.map((cat, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Strategy */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <StrategyIcon size={12} className="text-primary" />
            Recommended Strategy: {suggested_strategy.approach}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suggested_strategy.tips.map((tip, idx) => {
              const TipIcon = getTipIcon(tip);
              return (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <TipIcon size={12} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{tip}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      {negotiation_risk.factors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Risk Factors</p>
          <div className="space-y-1.5">
            {negotiation_risk.factors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <AlertCircle size={12} className="text-amber-600 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!has_historical_data && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-700">
            💡 First interaction with this adjuster. Standard documentation practices recommended.
          </p>
        </div>
      )}
    </div>
  );

  {showUpgrade && <UpgradePrompt feature="adjuster_insights" onClose={() => setShowUpgrade(false)} />}
}