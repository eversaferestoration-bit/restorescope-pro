import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Returns the authenticated user's companyId.
 * Uses userProfile from AuthContext (fast path), then falls back to DB lookup.
 * 
 * Returns: { companyId: string|null, loading: boolean }
 */
export function useCompanyId() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [resolvedId, setResolvedId] = useState(userProfile?.company_id || null);
  const [loading, setLoading] = useState(!userProfile?.company_id);

  useEffect(() => {
    // Fast path: already in auth context
    if (userProfile?.company_id) {
      setResolvedId(userProfile.company_id);
      setLoading(false);
      return;
    }

    if (!user?.id) return;

    let cancelled = false;
    async function resolve() {
      setLoading(true);
      try {
        // DB lookup
        const profiles = await base44.entities.UserProfile.filter(
          { user_id: user.id, is_deleted: false }, '-created_date', 1
        ).catch(() => []);
        const profile = profiles?.[0];
        if (profile?.company_id) {
          if (!cancelled) setResolvedId(profile.company_id);
          refreshUserProfile().catch(() => null);
          return;
        }
        // Last resort: find company by creator email
        if (user?.email) {
          const companies = await base44.entities.Company.filter(
            { created_by: user.email, is_deleted: false }, '-created_date', 1
          ).catch(() => []);
          const company = companies?.[0];
          if (company?.id && profile?.id) {
            await base44.entities.UserProfile.update(profile.id, { company_id: company.id }).catch(() => null);
            await refreshUserProfile().catch(() => null);
            if (!cancelled) setResolvedId(company.id);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [user?.id, userProfile?.company_id]);

  return { companyId: resolvedId, loading };
}