import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Mail, Calendar, FileText, CheckCircle, Activity } from 'lucide-react';

const ACTIVITY_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  stage_change: CheckCircle,
  file_uploaded: FileText,
};

export default function LeadActivity({ lead }) {
  const { data: activities = [] } = useQuery({
    queryKey: ['lead-activities', lead.id],
    queryFn: () => base44.entities.LeadActivity.filter({
      lead_id: lead.id,
      is_deleted: false,
    }, '-created_date', 100),
  });

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => {
        const Icon = ACTIVITY_ICONS[activity.activity_type] || Activity;
        return (
          <div key={activity.id} className="flex gap-4 pb-4 relative">
            {/* Timeline line */}
            {idx < activities.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-12 bg-muted" />
            )}

            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Icon size={18} className="text-muted-foreground" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pt-1.5">
              <p className="font-semibold">{activity.title}</p>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {activity.created_by_name && <span>{activity.created_by_name}</span>}
                <span>•</span>
                <span>{new Date(activity.created_date).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}