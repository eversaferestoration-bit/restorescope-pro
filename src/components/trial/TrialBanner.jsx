import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, Zap } from 'lucide-react';

/**
 * Shows a contextual trial banner:
 * - Trial active  → countdown with days left
 * - Trial expired → warning to upgrade (read-only mode)
 */
export default function TrialBanner({ daysLeft, isExpired, compact = false }) {
  if (!isExpired && daysLeft === null) return null;

  if (isExpired) {
    return (
      <div className={`flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 ${compact ? 'py-2.5' : 'py-3.5'}`}>
        <AlertTriangle size={16} className="text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-red-800 ${compact ? 'text-xs' : 'text-sm'}`}>
            Your free trial has ended
          </p>
          {!compact && (
            <p className="text-xs text-red-700 mt-0.5">
              Your account is in read-only mode. Upgrade to continue generating estimates and exports.
            </p>
          )}
        </div>
        <Link
          to="/billing"
          className={`shrink-0 inline-flex items-center gap-1.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition ${compact ? 'text-xs px-3 h-7' : 'text-sm px-4 h-9'}`}
        >
          <Zap size={12} /> Upgrade Now
        </Link>
      </div>
    );
  }

  // Trial active
  const urgent = daysLeft <= 3;

  const colors = urgent
    ? { wrap: 'bg-amber-50 border-amber-200', icon: 'text-amber-500', title: 'text-amber-800', body: 'text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700' }
    : { wrap: 'bg-blue-50 border-blue-200', icon: 'text-blue-500', title: 'text-blue-800', body: 'text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700' };

  return (
    <div className={`flex items-center gap-3 border rounded-xl px-4 ${compact ? 'py-2.5' : 'py-3.5'} ${colors.wrap}`}>
      <Clock size={16} className={`${colors.icon} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'} ${colors.title}`}>
          {daysLeft === 0
            ? 'Trial ends today'
            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial`}
        </p>
        {!compact && (
          <p className={`text-xs mt-0.5 ${colors.body}`}>
            Upgrade to keep full access to estimates, exports, and advanced features.
          </p>
        )}
      </div>
      <Link
        to="/billing"
        className={`shrink-0 inline-flex items-center gap-1.5 text-white font-semibold rounded-lg transition ${compact ? 'text-xs px-3 h-7' : 'text-sm px-4 h-9'} ${colors.btn}`}
      >
        <Zap size={12} /> Upgrade
      </Link>
    </div>
  );
}