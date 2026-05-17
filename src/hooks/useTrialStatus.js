import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * Single source of truth for trial/subscription status.
 *
 * Returns:
 *   loading      — still fetching
 *   isTrial      — in an active trial period
 *   isExpired    — trial ended AND no active paid plan
 *   isPaid       — active paid or enterprise subscription
 *   daysLeft     — days remaining in trial (null if not in trial)
 *   trialEnd     — ISO date string
 *   canUse(feat) — true if feature is allowed
 *   refresh()    — manually re-fetch (call after billing upgrade)
 *
 * Feature tiers:
 *   'basic'    — always allowed
 *   'estimate' — trial + paid
 *   'export'   — trial + paid
 *   'advanced' — paid only
 */

// All statuses that mean the user has an active paid account
const PAID_STATUSES = new Set(['active', 'paid', 'trialing_paid', 'enterprise', 'grandfathered']);
// Statuses that mean still in a valid (unpaid) trial
const TRIAL_STATUSES = new Set(['trialing', 'trial', 'beta']);
// Statuses that are definitively expired/cancelled
const EXPIRED_STATUSES = new Set(['canceled', 'cancelled', 'unpaid', 'past_due', 'expired', 'inactive']);

export function useTrialStatus() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    isTrial: false,
    isExpired: false,
    isPaid: false,
    daysLeft: null,
    trialEnd: null,
    _debugInfo: null,
  });

  const load = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Step 1: get user profile → companyId
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
      if (!profiles.length) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      const companyId = profiles[0].company_id;
      if (!companyId) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      // Step 2: get company — check for beta/enterprise flags
      let company = null;
      try {
        const companies = await base44.entities.Company.filter({ id: companyId, is_deleted: false });
        company = companies[0] || null;
      } catch {
        company = null;
      }

      // Step 3: get ALL subscriptions for this company, ordered by most recently updated
      // Use two sorts to catch the freshest record regardless of creation order
      let allSubs = [];
      try {
        allSubs = await base44.entities.Subscription.filter({ company_id: companyId }, '-updated_date', 10);
      } catch {
        allSubs = [];
      }

      // If updated_date sort fails or is unavailable, try created_date
      if (!allSubs.length) {
        try {
          allSubs = await base44.entities.Subscription.filter({ company_id: companyId }, '-created_date', 10);
        } catch {
          allSubs = [];
        }
      }

      const now = new Date();

      // Step 4: look for ANY active/paid subscription first (highest priority)
      const activeSub = allSubs.find(s => PAID_STATUSES.has(s.status));

      // Step 5: debug info
      const debugInfo = {
        companyId,
        subCount: allSubs.length,
        subStatuses: allSubs.map(s => s.status),
        activeSub: activeSub ? { id: activeSub.id, status: activeSub.status } : null,
        companyIsBeta: company?.is_beta_user,
        companyBetaStatus: company?.beta_status,
        userId: user.id,
      };
      console.log('[useTrialStatus] debug:', debugInfo);

      // Step 6: enterprise / admin override — company marked as enterprise
      if (company?.plan_id === 'enterprise' || company?.stripe_enabled === true && activeSub) {
        console.log('[useTrialStatus] → isPaid (enterprise/stripe override)');
        setState({ loading: false, isTrial: false, isExpired: false, isPaid: true, daysLeft: null, trialEnd: null, _debugInfo: debugInfo });
        return;
      }

      // Step 7: found an active paid sub
      if (activeSub) {
        console.log('[useTrialStatus] → isPaid, status:', activeSub.status);
        setState({ loading: false, isTrial: false, isExpired: false, isPaid: true, daysLeft: null, trialEnd: activeSub.trial_end || null, _debugInfo: debugInfo });
        return;
      }

      // Step 8: look for an active beta subscription (treated as paid/trial)
      if (company?.is_beta_user && company?.beta_status !== 'expired') {
        const betaEndDate = company.beta_end_date ? parseISO(company.beta_end_date) : null;
        const betaActive = !betaEndDate || betaEndDate > now;
        if (betaActive) {
          const daysLeft = betaEndDate ? Math.max(0, differenceInDays(betaEndDate, now)) : null;
          console.log('[useTrialStatus] → isTrial (active beta), daysLeft:', daysLeft);
          setState({ loading: false, isTrial: true, isExpired: false, isPaid: false, daysLeft, trialEnd: company.beta_end_date || null, _debugInfo: debugInfo });
          return;
        }
      }

      // Step 9: look for trial subscription
      const trialSub = allSubs.find(s => TRIAL_STATUSES.has(s.status));
      if (trialSub) {
        const trialEnd = trialSub.trial_end ? parseISO(trialSub.trial_end) : null;
        const trialActive = !trialEnd || trialEnd > now;
        if (trialActive) {
          const daysLeft = trialEnd ? Math.max(0, differenceInDays(trialEnd, now)) : null;
          console.log('[useTrialStatus] → isTrial (trial sub), daysLeft:', daysLeft);
          setState({ loading: false, isTrial: true, isExpired: false, isPaid: false, daysLeft, trialEnd: trialSub.trial_end || null, _debugInfo: debugInfo });
          return;
        }
      }

      // Step 10: explicitly expired/cancelled subscription
      const expiredSub = allSubs.find(s => EXPIRED_STATUSES.has(s.status));
      if (expiredSub) {
        console.log('[useTrialStatus] → isExpired, status:', expiredSub.status);
        setState({ loading: false, isTrial: false, isExpired: true, isPaid: false, daysLeft: null, trialEnd: null, _debugInfo: debugInfo });
        return;
      }

      // Step 11: no subscription record at all — do NOT default to expired
      // This can happen for newly created accounts or if Stripe sync is delayed.
      // Treat as a grace/unknown state — allow access, show nothing.
      if (allSubs.length === 0) {
        console.log('[useTrialStatus] → no subscription found, defaulting to grace (not expired)');
        setState({ loading: false, isTrial: false, isExpired: false, isPaid: false, daysLeft: null, trialEnd: null, _debugInfo: debugInfo });
        return;
      }

      // Step 12: fallback — most recent sub is in some other status
      const latestSub = allSubs[0];
      const trialEnd2 = latestSub.trial_end ? parseISO(latestSub.trial_end) : null;
      const isInTrial = TRIAL_STATUSES.has(latestSub.status) || (trialEnd2 && trialEnd2 > now);
      const isPaidFallback = PAID_STATUSES.has(latestSub.status);
      const isExpiredFallback = !isPaidFallback && !isInTrial && (trialEnd2 ? trialEnd2 <= now : false);
      const daysLeft = isInTrial && trialEnd2 ? Math.max(0, differenceInDays(trialEnd2, now)) : null;

      console.log('[useTrialStatus] → fallback:', { status: latestSub.status, isPaidFallback, isInTrial, isExpiredFallback });
      setState({
        loading: false,
        isTrial: isInTrial && !isPaidFallback,
        isExpired: isExpiredFallback,
        isPaid: isPaidFallback,
        daysLeft,
        trialEnd: latestSub.trial_end || null,
        _debugInfo: debugInfo,
      });

    } catch (err) {
      console.error('[useTrialStatus] error:', err);
      // On error, be permissive — don't block the user
      setState({ loading: false, isTrial: false, isExpired: false, isPaid: false, daysLeft: null, trialEnd: null, _debugInfo: null });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    load();

    // Re-check when window regains focus (catches subscription updates from other tabs / billing page)
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, load]);

  const canUse = (feature) => {
    if (state.loading) return true; // optimistic while loading
    if (state.isPaid) return true;  // paid → full access
    if (state.isExpired) return feature === 'basic';
    if (state.isTrial) return feature !== 'advanced';
    // Unknown state (no sub) — be permissive
    return true;
  };

  return { ...state, canUse, refresh: load };
}