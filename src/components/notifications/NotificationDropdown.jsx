import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationItem from './NotificationItem';
import NotificationDetailPanel from './NotificationDetailPanel';

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () =>
      base44.entities.Notification.filter(
        { user_id: user?.id, is_deleted: false },
        '-created_date',
        100
      ),
    enabled: !!user?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data.user_id === user.id) {
        refetch();
      }
    });
    return unsubscribe;
  }, [user?.id, refetch]);

  const unreadCount = notifications.filter((n) => !n.read_status).length;
  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const handleMarkRead = async (notificationId) => {
    await base44.entities.Notification.update(notificationId, {
      read_status: true,
    });
    refetch();
  };

  const handleMarkAllRead = async () => {
    for (const notif of notifications.filter((n) => !n.read_status)) {
      await base44.entities.Notification.update(notif.id, {
        read_status: true,
      });
    }
    refetch();
  };

  const handleDelete = async (notificationId) => {
    await base44.entities.Notification.update(notificationId, {
      is_deleted: true,
    });
    refetch();
  };

  if (selectedNotification) {
    return (
      <NotificationDetailPanel
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkRead={() => {
          handleMarkRead(selectedNotification.id);
          setSelectedNotification(null);
        }}
      />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
          open
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-12 right-0 w-96 max-h-96 bg-card border rounded-lg shadow-lg z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="px-4 py-2 border-b bg-muted/50 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <Filter size={12} className="text-muted-foreground" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-background border rounded px-2 py-1 text-xs"
                >
                  <option value="all">All</option>
                  <option value="new_lead">New Lead</option>
                  <option value="storm_event">Storm Event</option>
                  <option value="review_request">Review Request</option>
                  <option value="task_assignment">Task Assignment</option>
                  <option value="estimate_approval">Estimate Approval</option>
                  <option value="invoice_overdue">Invoice Overdue</option>
                  <option value="failed_save">Failed Save</option>
                  <option value="automation_completed">Automation Completed</option>
                </select>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No notifications
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onMarkRead={() => handleMarkRead(notif.id)}
                    onDelete={() => handleDelete(notif.id)}
                    onSelect={() => setSelectedNotification(notif)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}