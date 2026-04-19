import { useState } from 'react';
import { AlertCircle, AlertTriangle, Shield, ShieldAlert, ShieldCheck, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const RISK_CONFIG = {
  low: {
    icon: ShieldCheck,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    label: 'Low Risk',
  },
  medium: {
    icon: Shield,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    label: 'Medium Risk',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    label: 'High Risk',
  },
  critical: {
    icon: ShieldAlert,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    label: 'Critical Risk',
  },
};

const CATEGORY_ICONS = {
  excessive_overrides: AlertCircle,
  missing_documentation: AlertCircle,
  inconsistent_data: AlertCircle,
  abnormal_pricing: AlertCircle,
};

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function RiskPanel({ riskData, onClose }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!riskData) return null;

  const { risk_level, risk_flags } = riskData;
  const config = RISK_CONFIG[risk_level] || RISK_CONFIG.low;
  const Icon = config.icon;

  // Group flags by category
  const byCategory = {};
  for (const flag of risk_flags) {
    if (!byCategory[flag.category]) byCategory[flag.category] = [];
    byCategory[flag.category].push(flag);
  }

  const toggleCategory = (cat) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-2xl border border-border max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('px-6 py-4 border-b flex items-center justify-between', config.bg)}>
          <div className="flex items-center gap-3">
            <Icon size={24} className={config.color} />
            <div>
              <h3 className={cn('text-lg font-bold', config.color)}>Risk Analysis Report</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {risk_flags.length} risk flag{risk_flags.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Risk Level</p>
              <p className={cn('text-lg font-bold', config.color)}>{config.label}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <p className="text-lg font-bold">{riskData.risk_score || 0}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Analyzed</p>
              <p className="text-sm font-medium">
                {riskData.analyzed_at ? new Date(riskData.analyzed_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Flags by Category */}
        <div className="p-6 overflow-y-auto max-h-96">
          {risk_flags.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck size={32} className="mx-auto text-green-600 mb-2" />
              <p className="text-sm font-medium text-green-700">No risk flags detected</p>
              <p className="text-xs text-muted-foreground mt-1">This job appears to be well-documented and compliant.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory).map(([category, flags]) => {
                const CategoryIcon = CATEGORY_ICONS[category] || AlertCircle;
                const isExpanded = expandedCategory === category;
                const maxSeverity = flags.reduce((max, f) => {
                  const order = { low: 1, medium: 2, high: 3, critical: 4 };
                  return order[f.severity] > order[max] ? f.severity : max;
                }, 'low');

                return (
                  <div key={category} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon size={16} className="text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-semibold capitalize">{category.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{flags.length} issue{flags.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SEVERITY_COLORS[maxSeverity])}>
                          {maxSeverity}
                        </span>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 border-t border-border space-y-2">
                        {flags.map((flag, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
                            <AlertCircle size={14} className={cn('shrink-0 mt-0.5', 
                              flag.severity === 'critical' ? 'text-red-600' :
                              flag.severity === 'high' ? 'text-orange-600' :
                              flag.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                            )} />
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">{flag.description}</p>
                              {flag.estimate_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Estimate: {flag.estimate_id.slice(-8)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}