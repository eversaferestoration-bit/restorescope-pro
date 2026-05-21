import { ArrowLeft, Check, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const notificationIcons = {
  new_lead: '👤',
  storm_event: '⛈️',
  review_request: '⭐',
  task_assignment: '✓',
  estimate_approval: '📋',
  invoice_overdue: '💳',
  failed_save: '⚠️',
  automation_completed: '🤖',
};

const notificationTypeLabels = {
  new_lead: 'New Lead',
  storm_event: 'Storm Event',
  review_request: 'Review Request',
  task_assignment: 'Task Assignment',
  estimate_approval: 'Estimate Approval',
  invoice_overdue: 'Invoice Overdue',
  failed_save: 'Failed Save',
  automation_completed: 'Automation Completed',
};

export default function NotificationDetailPanel({
  notification,
  onClose,
  onMarkRead,
}) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (notification.linked_record?.link_url) {
      navigate(notification.linked_record.link_url);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:w-96 h-screen sm:h-auto sm:rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/50">
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded text-muted-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {notificationTypeLabels[notification.type]}
          </span>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-4xl">
              {notificationIcons[notification.type] || '📢'}
            </span>
            <div>
              <h2 className="text-lg font-bold">{notification.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(notification.created_date), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-foreground leading-relaxed">
              {notification.message}
            </p>
          </div>

          {notification.linked_record && (
            <div className="pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Linked Record
              </p>
              <button
                onClick={handleNavigate}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition"
              >
                <span>View {notification.linked_record.entity_type}</span>
                <ExternalLink size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t flex items-center gap-2 bg-muted/50">
          {!notification.read_status && (
            <button
              onClick={onMarkRead}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition flex items-center justify-center gap-2"
            >
              <Check size={16} /> Mark Read
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-secondary transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}