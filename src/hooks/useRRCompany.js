/**
 * useRRCompany — RestoreReach company context hook
 *
 * Provides a stable, authenticated companyId for all RR entity queries.
 * companyId = RRCompanyProfile.id if it exists, else user.email (fallback for new users).
 *
 * All entity queries in RestoreReach MUST filter by this companyId so that
 * records from other companies are never exposed to the current user.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useRRCompany() {
  const { user } = useAuth();

  const { data: profileArr = [], isLoading: profileLoading } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const profile = profileArr[0] ?? null;

  // Use the profile record id as companyId once it exists;
  // fall back to user.email so new users can still create their first records.
  const companyId = profile?.id ?? user?.email ?? null;

  return {
    user,
    profile,
    companyId,
    profileLoading,
    isReady: !!companyId,
  };
}