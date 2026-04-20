import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBetaAccess } from '@/hooks/useBetaAccess';

/**
 * Compact trial status card for dashboard.
 * Shows countdown or expiry status in a small, non-intrusive format.
 */
export default function TrialCountdownCard({ isExpired, daysLeft }) {
  const { isBlockedByExpiredBeta } = useBetaAccess();

  // Safety: if beta expired and no subscription, don't render here (should be caught at action level)
  // This prevents double-blocking and keeps UI responsive
  if (!isExpired && daysLeft === null && !isBlockedByExpiredBeta) return null;

  // Determine styling based on status
  const isUrgent = !isExpired && daysLeft !== null && daysLeft <= 3;
  const config = isExpired
    ? {
        icon: AlertCircle,
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-700',
        label: 'Trial Expired',
        message: 'Upgrade to continue',
        urgent: true,
      }
    : isUrgent
      ? {
          icon: AlertTriangle,
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-700',
          label: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
          message: 'Trial ending soon',
          urgent: true,
        }
      : {
          icon: Clock,
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          label: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
          message: 'Trial active',
          urgent: false,
        };

  const Icon = config.icon;

  return (
    <Link to="/billing">
      <div
        className={cn(
          'bg-card rounded-xl border p-4 flex items-start gap-3 transition-all hover:shadow-sm cursor-pointer',
          config.bg
        )}
      >
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 flex-col', config.bg.replace('bg-', 'bg-').replace('50', '100'))}>
          <Icon size={17} className={config.text} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-semibold', config.text)}>{config.label}</p>
          <p className={cn('text-xs mt-0.5', config.text.replace('700', '600'))}>
            {config.message}
          </p>
        </div>
        {config.urgent && (
          <div className={cn('text-xs font-bold px-2 py-1 rounded-md shrink-0', config.bg)}>
            ⚠
          </div>
        )}
      </div>
    </Link>
  );
}