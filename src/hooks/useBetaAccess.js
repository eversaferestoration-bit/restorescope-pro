import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isAfter, parseISO } from 'date-fns';

/**
 * Returns beta access status for the current user's company.
 * Also auto-expires beta on every app load if beta_end_date has passed.
 *
 * {
 *   loading,
 *   isBeta,       — company is a beta user AND status is active
 *   isBetaExpired — company was a beta user but beta has expired
 * }
 */
export function useBetaAccess() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, isBeta: false, isBetaExpired: false });

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
        if (!profiles.length) { setState({ loading: false, isBeta: false, isBetaExpired: false }); return; }

        const companyId = profiles[0].company_id;
        if (!companyId) { setState({ loading: false, isBeta: false, isBetaExpired: false }); return; }

        const companies = await base44.entities.Company.filter({ id: companyId, is_deleted: false });
        if (!companies.length) { setState({ loading: false, isBeta: false, isBetaExpired: false }); return; }

        const company = companies[0];

        if (!company.is_beta_user) {
          setState({ loading: false, isBeta: false, isBetaExpired: false });
          return;
        }

        const now = new Date();
        const endDate = company.beta_end_date ? parseISO(company.beta_end_date) : null;
        const hasExpired = endDate && isAfter(now, endDate);

        // Auto-expire if past end date and not yet marked expired
        if (hasExpired && company.beta_status !== 'expired') {
          await base44.entities.Company.update(companyId, { beta_status: 'expired' });
        }

        const effectiveStatus = hasExpired ? 'expired' : (company.beta_status || 'active');

        setState({
          loading: false,
          isBeta: effectiveStatus === 'active',
          isBetaExpired: effectiveStatus === 'expired',
        });
      } catch {
        setState({ loading: false, isBeta: false, isBetaExpired: false });
      }
    };

    load();
  }, [user?.id]);

  return state;
}