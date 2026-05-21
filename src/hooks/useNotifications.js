import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useCompany } from '@/lib/CompanyContext';

export function useNotifications() {
  const { user } = useAuth();
  const { companyId } = useCompany();

  const { data: notifications = [], refetch, ...rest } = useQuery({
    queryKey: ['notifications', companyId, user?.id],
    queryFn: () =>
      base44.entities.Notification.filter(
        { company_id: companyId, user_id: user?.id, is_deleted: false },
        '-created_date',
        100
      ),
    enabled: !!companyId && !!user?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!companyId || !user?.id) return;

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (
        event.data.company_id === companyId &&
        event.data.user_id === user?.id &&
        !event.data.is_deleted
      ) {
        refetch();
      }
    });

    return unsubscribe;
  }, [companyId, user?.id, refetch]);

  const unreadCount = notifications.filter((n) => !n.read_status).length;
  const unreadNotifications = notifications.filter((n) => !n.read_status);

  return {
    notifications,
    unreadCount,
    unreadNotifications,
    refetch,
    ...rest,
  };
}