import { useTrialStatus } from './useTrialStatus';
import { useUsageLimits } from './useFeatureAccess';

/**
 * Returns a nudge descriptor when the user should see an upgrade prompt.
 *
 * Usage:
 *   const nudge = useUpgradeTrigger({ feature: 'advanced' });
 *   if (nudge) <UpgradeNudge {...nudge} />
 *
 * feature:
 *   'basic'     — always allowed
 *   'estimate'  — trial + paid
 *   'export'    — trial + paid
 *   'advanced'  — paid only
 *
 * Returns null when no nudge is needed, or:
 *   { variant, message, cta }
 */
export function useUpgradeTrigger({ feature = 'basic', checkLimits = false } = {}) {
  const { isTrial, isExpired, isPaid, daysLeft, loading } = useTrialStatus();
  const { usage, loading: usageLoading } = checkLimits ? useUsageLimits() : { usage: null, loading: false };

  if (loading) return null;

  // 1. Expired — highest priority
  if (isExpired) {
    return {
      variant: 'expired',
      message: 'Your free trial has ended. Upgrade to regain full access.',
      cta: 'Upgrade Now',
    };
  }

  // 2. Premium feature attempted on trial
  if (feature === 'advanced' && !isPaid) {
    return {
      variant: 'premium',
      message: 'This feature is available on paid plans.',
      cta: 'Upgrade',
    };
  }

  // 3. Usage limit hit
  if (checkLimits && !usageLoading && usage?.limitReached) {
    return {
      variant: 'limit',
      message: `You've hit your plan limit. Upgrade to continue without interruption.`,
      cta: 'Upgrade Plan',
    };
  }

  // 4. Near trial expiration (≤ 5 days)
  if (isTrial && daysLeft !== null && daysLeft <= 5) {
    return {
      variant: 'trial',
      message: daysLeft === 0
        ? 'Your trial ends today — upgrade to keep access.'
        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial.`,
      cta: 'Upgrade',
    };
  }

  return null;
}