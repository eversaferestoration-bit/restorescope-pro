import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { AlertCircle, CheckCircle, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const REMINDER_CONFIG = {
  estimate_followup: { icon: Clock, color: '#f59e0b', label: 'Follow Up Needed', desc: 'Estimate sent but not followed up' },
  no_response: { icon: AlertCircle, color: '#ef4444', label: 'No Response', desc: 'No response in 3+ days' },
  unpaid_invoice: { icon: DollarSign, color: '#ef4444', label: 'Unpaid Invoice', desc: 'Invoice pending payment' },
  missing_review: { icon: MessageSquare, color: '#f59e0b', label: 'Missing Review', desc: 'Send review request' },
};

export default function CRMReminders() {
  const companyId = useCompanyId();
  const qc = useQueryClient();

  const { data: allReminders = [] } = useQuery({
    queryKey: ['all-reminders', companyId],
    queryFn: async () => {
      const reminders = await base44.entities.LeadReminder.filter({
        company_id: companyId,
        is_dismissed: false,
        is_deleted: false,
      }, '-created_date', 200);
      
      // Fetch lead info for each reminder
      const enriched = await Promise.all(reminders.map(async (r) => {
        try {
          const lead = await base44.entities.CRMLead.get(r.lead_id);
          return { ...r, lead };
        } catch {
          return { ...r, lead: null };
        }
      }));
      
      return enriched.filter(r => r.lead);
    },
    enabled: !!companyId,
  });

  const dismissMutation = useMutation({
    mutationFn: (reminderId) => base44.entities.LeadReminder.update(reminderId, {
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-reminders'] });
      toast({ title: '✅ Reminder dismissed' });
    },
  });

  // Group by type
  const remindersByType = REMINDER_CONFIG.estimate_followup ? Object.keys(REMINDER_CONFIG).reduce((acc, type) => {
    acc[type] = allReminders.filter(r => r.reminder_type === type);
    return acc;
  }, {}) : {};

  const openCount = allReminders.length;
  const highPriority = allReminders.filter(r => ['no_response', 'unpaid_invoice'].includes(r.reminder_type)).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Reminders & Follow-ups</h1>
        <div className="flex gap-4 text-sm">
          <div className="px-3 py-1 rounded bg-muted">Total: <span className="font-bold">{openCount}</span></div>
          {highPriority > 0 && <div className="px-3 py-1 rounded bg-destructive/10 text-destructive font-semibold">High Priority: {highPriority}</div>}
        </div>
      </div>

      {openCount === 0 ? (
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-600 mb-3" />
          <p className="text-lg font-semibold">All caught up!</p>
          <p className="text-muted-foreground">No active reminders</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(remindersByType).map(([type, reminders]) => {
            if (reminders.length === 0) return null;
            const cfg = REMINDER_CONFIG[type];
            const Icon = cfg.icon;

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={20} style={{ color: cfg.color }} />
                  <h2 className="text-lg font-bold">{cfg.label}</h2>
                  <span className="text-xs px-2 py-1 rounded bg-muted">{reminders.length}</span>
                </div>

                <div className="grid gap-3">
                  {reminders.map(reminder => (
                    <Link key={reminder.id} to={`/crm/lead/${reminder.lead_id}`}
                      className="p-4 rounded-lg bg-card border hover:border-foreground hover:shadow-lg transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{reminder.lead?.customer_name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            {reminder.lead?.phone && <span>📞 {reminder.lead.phone}</span>}
                            {reminder.lead?.service_type && <span>{reminder.lead.service_type}</span>}
                          </div>
                        </div>
                        <button onClick={(e) => {
                          e.preventDefault();
                          dismissMutation.mutate(reminder.id);
                        }}
                          className="text-xs px-3 py-1 rounded bg-muted hover:bg-muted/80">
                          Dismiss
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}