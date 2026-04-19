import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { 
  Target, 
  Shield, 
  Handshake, 
  AlertCircle, 
  CheckCircle, 
  TrendingDown,
  MessageSquare,
  DollarSign,
  BarChart3,
  FileText,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const APPROACH_COLORS = {
  defensive: 'bg-red-100 text-red-700 border-red-300',
  balanced: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  collaborative: 'bg-green-100 text-green-700 border-green-300',
  standard: 'bg-blue-100 text-blue-700 border-blue-300',
};

const APPROACH_ICONS = {
  defensive: Shield,
  balanced: Target,
  collaborative: Handshake,
  standard: FileText,
};

const PRIORITY_COLORS = {
  defend: 'bg-green-100 text-green-700 border-green-300',
  negotiate: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  concede: 'bg-red-100 text-red-700 border-red-300',
};

const DEFENSIBILITY_COLORS = {
  strong: 'text-green-600',
  moderate: 'text-yellow-600',
  weak: 'text-red-600',
};

function ApproachBadge({ approach }) {
  const Icon = APPROACH_ICONS[approach] || APPROACH_ICONS.standard;
  return (
    <Badge className={cn('text-xs border', APPROACH_COLORS[approach] || APPROACH_COLORS.standard)}>
      <Icon size={10} className="inline mr-1" />
      {approach}
    </Badge>
  );
}

function PriorityBadge({ priority }) {
  const icons = {
    defend: Shield,
    negotiate: Target,
    concede: TrendingDown,
  };
  const Icon = icons[priority] || icons.defend;
  
  return (
    <Badge className={cn('text-xs border', PRIORITY_COLORS[priority])}>
      <Icon size={10} className="inline mr-1" />
      {priority}
    </Badge>
  );
}

function ItemRow({ item, expanded, onToggle }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-3 text-left">
          <PriorityBadge priority={item.priority} />
          <div>
            <p className="text-sm font-medium">{item.description}</p>
            <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">${item.line_total.toLocaleString()}</span>
          <span className={cn('text-xs font-medium capitalize', DEFENSIBILITY_COLORS[item.defensibility])}>
            {item.defensibility}
          </span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 py-3 bg-card space-y-2 border-t border-border">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Reasoning:</p>
            {item.reasoning.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertCircle size={10} className="mt-0.5 shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-1.5 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground">Suggested Actions:</p>
            {item.suggested_action.map((action, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs">
                <CheckCircle size={10} className="mt-0.5 text-green-600 shrink-0" />
                <span className="text-muted-foreground">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color = 'text-primary' }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center', color)}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NegotiationPanel({ estimateId, adjusterId }) {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [expandedItems, setExpandedItems] = useState({});
  const [carrierFeedback, setCarrierFeedback] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: strategy, isLoading, error, refetch } = useQuery({
    queryKey: ['negotiation-strategy', estimateId, adjusterId, carrierFeedback],
    queryFn: () => base44.functions.invoke('generateNegotiationStrategy', {
      estimate_version_id: estimateId,
      adjuster_id: adjusterId,
      carrier_feedback: carrierFeedback || undefined,
    }),
    enabled: false,
    retry: 1,
  });

  const handleGenerate = () => {
    setGenerating(true);
    refetch().finally(() => setGenerating(false));
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
        <p className="text-sm text-muted-foreground">Negotiation mode is available for managers and admins only.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">Failed to generate negotiation strategy</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  if (!strategy && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb size={20} className="text-primary" />
            <h3 className="text-sm font-semibold">Assisted Negotiation Mode</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Generate a data-driven negotiation strategy based on estimate analysis, adjuster behavior, and carrier feedback.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Carrier Feedback (Optional)</label>
            <textarea
              value={carrierFeedback}
              onChange={(e) => setCarrierFeedback(e.target.value)}
              placeholder="e.g., 'Carrier says pricing is too high for deodorization'"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Generating Strategy…
              </>
            ) : (
              <>
                <Target size={14} className="mr-2" />
                Generate Negotiation Strategy
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || generating) {
    return (
      <div className="rounded-xl border border-border p-8 text-center">
        <Loader2 size={32} className="mx-auto text-primary animate-spin mb-3" />
        <p className="text-sm font-medium">Analyzing estimate and generating negotiation strategy…</p>
        <p className="text-xs text-muted-foreground mt-1">This may take 10–15 seconds</p>
      </div>
    );
  }

  const { strategy: strat, item_analysis, priorities, negotiation_metrics, suggested_response_wording, adjuster_insights } = strategy.data;

  return (
    <div className="space-y-4">
      {/* Strategy Overview */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target size={14} className="text-primary" />
            Negotiation Strategy: {strat.approach}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <ApproachBadge approach={strat.approach} />
            <span className="text-xs text-muted-foreground">{strat.summary}</span>
          </div>
          
          <div className="space-y-1.5">
            {strat.approach_reasoning.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <Lightbulb size={12} className="text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>

          {adjuster_insights && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <BarChart3 size={12} />
                <span>Adjuster Insights</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-xs">
                  <span className="text-muted-foreground">Approval Rate:</span>{' '}
                  <span className="font-medium">{adjuster_insights.approval_rate}%</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Avg Reduction:</span>{' '}
                  <span className="font-medium">{adjuster_insights.avg_reduction}%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Negotiation Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={DollarSign}
          label="Total Estimate"
          value={`$${negotiation_metrics.total_estimate_value.toLocaleString()}`}
          color="text-blue-600"
        />
        <MetricCard
          icon={Target}
          label="Target Settlement"
          value={`$${Math.round(negotiation_metrics.target_settlement_value).toLocaleString()}`}
          subtext="Recommended goal"
          color="text-green-600"
        />
        <MetricCard
          icon={TrendingDown}
          label="Max Concession"
          value={`$${Math.round(negotiation_metrics.max_concession_value).toLocaleString()}`}
          subtext="Willing to reduce"
          color="text-yellow-600"
        />
        <MetricCard
          icon={Shield}
          label="Walk-Away Point"
          value={`$${Math.round(negotiation_metrics.walk_away_value).toLocaleString()}`}
          subtext="Minimum acceptable"
          color="text-red-600"
        />
      </div>

      {/* Priority Breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 size={14} className="text-muted-foreground" />
            Item Priorities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-2xl font-bold text-green-700">{priorities.defend.count}</p>
              <p className="text-xs text-green-700">Defend</p>
              <p className="text-xs text-green-600 mt-1">${priorities.defend.total_value.toLocaleString()}</p>
              <p className="text-xs text-green-600">{priorities.defend.percentage}% of total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{priorities.negotiate.count}</p>
              <p className="text-xs text-yellow-700">Negotiate</p>
              <p className="text-xs text-yellow-600 mt-1">${priorities.negotiate.total_value.toLocaleString()}</p>
              <p className="text-xs text-yellow-600">{priorities.negotiate.percentage}% of total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-700">{priorities.concede.count}</p>
              <p className="text-xs text-red-700">Concede</p>
              <p className="text-xs text-red-600 mt-1">${priorities.concede.total_value.toLocaleString()}</p>
              <p className="text-xs text-red-600">{priorities.concede.percentage}% of total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items by Priority */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          Line Item Analysis
        </h4>
        
        <div className="space-y-2">
          {item_analysis.map((item, idx) => (
            <ItemRow
              key={item.line_item_id || idx}
              item={item}
              expanded={!!expandedItems[item.line_item_id]}
              onToggle={() => toggleItem(item.line_item_id)}
            />
          ))}
        </div>
      </div>

      {/* Suggested Response */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare size={14} className="text-blue-600" />
            Suggested Response Wording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-white border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Opening:</p>
            <p className="text-muted-foreground">{suggested_response_wording.opening}</p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Defense:</p>
            <p className="text-muted-foreground">{suggested_response_wording.defense}</p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Flexibility:</p>
            <p className="text-muted-foreground">{suggested_response_wording.flexibility}</p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Closing:</p>
            <p className="text-muted-foreground">{suggested_response_wording.closing}</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <h4 className="text-sm font-semibold text-amber-800">Negotiation Tips</h4>
        </div>
        <ul className="space-y-1.5 text-xs text-amber-700">
          <li>• Focus your energy on defending high-value, well-documented items</li>
          <li>• Be prepared to concede on weak items to preserve negotiation capital</li>
          <li>• Use the suggested response wording as a starting point, customize as needed</li>
          <li>• Document all carrier communications for future reference</li>
        </ul>
      </div>
    </div>
  );
}