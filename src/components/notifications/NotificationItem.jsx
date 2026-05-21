import { Link } from 'react-router-dom';
import { Check, Zap, AlertCircle, CheckCircle, FileCheck, Clock, AlertTriangle, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const NOTIFICATION_CONFIG = {
  new_lead: { icon: AlertCircle, color: '#3b82f6', bgColor: '#3b82f620', label: 'New Lead' },
  storm_event: { icon: Zap, color: '#f59e0b', bgColor: '#f59e0b20', label: 'Storm Event' },
  review_request: { icon: CheckCircle, color: '#10b981', bgColor: '#10b98120', label: 'Review Request' },
  task_assignment: { icon: Clock, color: '#8b5cf6', bgColor: '#8b5cf620', label: 'Task Assigned' },
  estimate_approval: { icon: FileCheck, color: '#06b6d4', bgColor: '#06b6d420', label: 'Estimate Approved' },
  invoice_overdue: { icon: AlertTriangle, color: '#ef4444', bgColor: '#ef444420', label: 'Invoice Overdue' },
  failed_save: { icon: AlertTriangle, color: '#ef4444', bgColor: '#ef444420', label: 'Save Failed' },
  automation_completed: { icon: Lightbulb, color: '#e05a1c', bgColor: '#e05a1c20', label: 'Automation Complete' },
};

export default function NotificationItem({ notification, onMarkRead, onClose }) {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.new_lead;
  const Icon = config.icon;

  const handleMarkRead = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkRead(notification.id, notification.read_status);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await base44.entities.Notification.update(notification.id, {
      is_deleted: true,
    });
    onClose();
  };

  const linkContent = (
    <div
      className={cn(
        'p-3 hover:bg-secondary transition cursor-pointer border-l-4',
        notification.read_status ? 'opacity-60' : 'font-medium'
      )}
      style={{ borderColor: config.color }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: config.bgColor }}
        >
          <Icon size={16} style={{ color: config.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleMarkRead}
                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition"
                title={notification.read_status ? 'Mark unread' : 'Mark read'}
              >
                <Check size={14} />
              </button>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );

  // If there's a linked record, make it a link
  if (notification.linked_record?.link_url) {
    return <Link to={notification.linked_record.link_url}>{linkContent}</Link>;
  }

  return linkContent;
}