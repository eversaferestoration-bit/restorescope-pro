import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationItem from './NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const dropdownRef = useRef(null);

  const { notifications, unreadCount, refetch } = useNotifications();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : filter === 'unread'
        ? notifications.filter((n) => !n.read_status)
        : notifications.filter((n) => n.type === filter);

  const handleMarkRead = async (notificationId, currentStatus) => {
    await base44.entities.Notification.update(notificationId, {
      read_status: !currentStatus,
    });
  };

  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read_status);
    for (const notif of unreadNotifications) {
      await base44.entities.Notification.update(notif.id, {
        read_status: true,
      });
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-card border rounded-lg shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="text-sm font-bold">Notifications</h2>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="border-b px-3 py-2 flex gap-1 overflow-x-auto">
            {[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'new_lead', label: 'Leads' },
              { value: 'task_assignment', label: 'Tasks' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition',
                  filter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onMarkRead={handleMarkRead}
                    onClose={() => refetch()}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t p-3 text-center">
              <button className="text-xs text-muted-foreground hover:text-foreground">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}