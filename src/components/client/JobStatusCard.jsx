import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  new: { icon: AlertCircle, color: 'bg-blue-100 text-blue-700', label: 'New' },
  in_progress: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'In Progress' },
  pending_approval: { icon: Clock, color: 'bg-orange-100 text-orange-700', label: 'Pending Approval' },
  approved: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Approved' },
  closed: { icon: CheckCircle, color: 'bg-slate-100 text-slate-700', label: 'Closed' },
};

export default function JobStatusCard({ job, estimate }) {
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.new;
  const Icon = statusConfig.icon;

  return (
    <Card className="border-border hover:shadow-md transition">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">
                {job.job_number || `Job #${job.id?.slice(-6)}`}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {job.loss_type}{job.service_type ? ` • ${job.service_type}` : ''}
              </p>
            </div>
            <Badge className={statusConfig.color} variant="outline">
              <Icon size={12} className="mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {job.date_of_loss && (
              <div>
                <p className="text-muted-foreground">Date of Loss</p>
                <p className="font-medium">
                  {format(new Date(job.date_of_loss), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {job.claim_number && (
              <div>
                <p className="text-muted-foreground">Claim #</p>
                <p className="font-medium">{job.claim_number}</p>
              </div>
            )}
            {job.property_address && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Property Address</p>
                <p className="font-medium">{job.property_address}</p>
              </div>
            )}
          </div>

          {estimate && estimate.status === 'approved' && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Approved Total</p>
                <p className="text-lg font-bold text-green-600">
                  ${estimate.total?.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {job.emergency_flag && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <AlertCircle size={12} className="text-red-600 shrink-0" />
              <p className="text-xs font-medium text-red-700">Emergency services</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}