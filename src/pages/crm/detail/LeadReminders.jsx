import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Trash2 } from 'lucide-react';

const REMINDER_COLORS = {
  estimate_followup: '#f59e0b',
  no_response: '#ef4444',
  unpaid_invoice: '#dc2626',
  missing_review: '#8b5cf6',
};

export default function LeadReminders({ lead }) {
  const qc = useQueryClient();

  const { data: reminders = [] } = useQuery({
    queryKey: ['lead-reminders', lead.id],
    queryFn: () => base44.entities.LeadReminder.filter({
      lead_id: lead.id,
      is_deleted: false,
    }, '-due_date', 100),
  });

  const statusMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadReminder.update(data.id, { status: data.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-reminders', lead.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadReminder.update(id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-reminders', lead.id] });
    },
  });

  const pending = reminders.filter(r => r.status === 'pending');
  const completed = reminders.filter(r => r.status === 'completed');

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Bell size={16} /> Pending Reminders ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(reminder => (
              <div
                key={reminder.id}
                className="rounded-lg border p-4 bg-card"
                style={{ borderLeftColor: REMINDER_COLORS[reminder.reminder_type] || '#3b82f6', borderLeftWidth: 4 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold">{reminder.title}</p>
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Due {new Date(reminder.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => statusMutation.mutate({ id: reminder.id, status: 'completed' })}
                      className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-green-500">
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(reminder.id)}
                      className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-destructive">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Completed ({completed.length})</h3>
          <div className="space-y-2">
            {completed.map(reminder => (
              <div key={reminder.id} className="rounded-lg border p-3 bg-muted/30 flex items-center justify-between">
                <p className="text-sm line-through text-muted-foreground">{reminder.title}</p>
                <button
                  onClick={() => deleteMutation.mutate(reminder.id)}
                  className="text-muted-foreground hover:text-destructive transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {reminders.length === 0 && (
        <p className="text-sm text-muted-foreground">No reminders</p>
      )}
    </div>
  );
}