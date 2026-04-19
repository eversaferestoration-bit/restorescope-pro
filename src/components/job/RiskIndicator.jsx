import { AlertCircle, AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
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

export default function RiskIndicator({ riskLevel, flagCount, onClick }) {
  if (!riskLevel) return null;

  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition hover:opacity-90',
        config.bg,
        config.color
      )}
      title={flagCount > 0 ? `${flagCount} risk flag${flagCount > 1 ? 's' : ''} detected` : 'No risk flags'}
    >
      <Icon size={12} />
      <span>{config.label}</span>
      {flagCount > 0 && (
        <span className={cn('ml-1 px-1.5 py-0.5 rounded-full text-xs', config.bg)}>
          {flagCount}
        </span>
      )}
    </button>
  );
}