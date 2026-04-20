import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * Returns trial/subscription status for the current user's company.
 *
 * {
 *   loading,
 *   isTrial,       — currently in trial period
 *   isExpired,     — trial ended AND no paid plan
 *   isPaid,        — active paid subscription
 *   daysLeft,      — days remaining in trial (null if not in trial)
 *   trialEnd,      — ISO date string
 *   canUse(feat),  — true if feature allowed at current status
 * }
 *
 * Feature tiers:
 *   'basic'     — always allowed (read-only browsing)
 *   'estimate'  — allowed on trial + paid
 *   'export'    — allowed on trial + paid
 *   'advanced'  — paid only (analytics, defense, adjuster insights)
 */
export function useTrialStatus() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    isTrial: false,
    isExpired: false,
    isPaid: false,
    daysLeft: null,
    trialEnd: null,
  });

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
        if (!profiles.length) { setState(s => ({ ...s, loading: false })); return; }

        const companyId = profiles[0].company_id;
        if (!companyId) { setState(s => ({ ...s, loading: false })); return; }

        const subs = await base44.entities.Subscription.filter({ company_id: companyId }, '-created_date', 1);
        const sub = subs[0];

        if (!sub) {
          // No subscription at all — treat as expired trial
          setState({ loading: false, isTrial: false, isExpired: true, isPaid: false, daysLeft: null, trialEnd: null });
          return;
        }

        const now = new Date();
        const trialEnd = sub.trial_end ? parseISO(sub.trial_end) : null;
        const isInTrial = sub.status === 'trialing' || (trialEnd && trialEnd > now && sub.status !== 'active');
        const isPaid = sub.status === 'active';
        const isExpired = !isPaid && trialEnd && trialEnd <= now;
        const daysLeft = isInTrial && trialEnd ? Math.max(0, differenceInDays(trialEnd, now)) : null;

        setState({
          loading: false,
          isTrial: isInTrial,
          isExpired: !!isExpired,
          isPaid,
          daysLeft,
          trialEnd: sub.trial_end || null,
        });
      } catch {
        // On error, don't block the user
        setState({ loading: false, isTrial: false, isExpired: false, isPaid: false, daysLeft: null, trialEnd: null });
      }
    };

    load();
  }, [user?.id]);

  const canUse = (feature) => {
    if (state.loading) return true; // optimistic while loading
    if (state.isPaid) return true;
    if (state.isExpired) return feature === 'basic'; // read-only after expiry
    if (state.isTrial) return feature !== 'advanced'; // trial blocks advanced-only
    return feature === 'basic';
  };

  return { ...state, canUse };
}