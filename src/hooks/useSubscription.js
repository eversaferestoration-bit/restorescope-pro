import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from './useCompanyId';

export function useSubscription() {
  const companyId = useCompanyId();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const subs = await base44.entities.Subscription.filter({
        company_id: companyId
      });
      return subs[0] || null;
    },
    enabled: !!companyId,
  });

  const hasFeature = (featureName) => {
    if (!subscription) return false;
    return subscription.features?.[featureName] ?? false;
  };

  const canUseFeature = (featureName) => {
    return hasFeature(featureName);
  };

  const isOnPlan = (plan) => {
    return subscription?.plan === plan;
  };

  const isTrialing = () => {
    return subscription?.status === 'trial' && !!subscription?.trial_end;
  };

  const trialDaysLeft = () => {
    if (!isTrialing()) return 0;
    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  return {
    subscription,
    isLoading,
    error,
    hasFeature,
    canUseFeature,
    isOnPlan,
    isTrialing,
    trialDaysLeft,
    planName: subscription?.plan || 'free',
    status: subscription?.status || 'inactive',
    billingCycle: subscription?.billing_cycle || 'monthly'
  };
}