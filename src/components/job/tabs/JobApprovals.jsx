import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Lock, XCircle, FileCheck, GitBranch, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  draft:      { icon: Clock,        color: 'text-blue-500',  bg: 'bg-blue-50 border-blue-200',   label: 'Draft' },
  submitted:  { icon: AlertCircle,  color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'Awaiting Approval' },
  approved:   { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Approved' },
  locked:     { icon: Lock,         color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', label: 'Locked' },
  rejected:   { icon: XCircle,      color: 'text-red-500',   bg: 'bg-red-50 border-red-200',     label: 'Rejected' },
  superseded: { icon: GitBranch,    color: 'text-muted-foreground', bg: 'bg-muted border-border', label: 'Superseded' },
};

function TimelineEntry({ draft, isLast }) {
  const cfg = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;

  return (
    <div className="flex gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center border shrink-0', cfg.bg)}>
          <Icon size={15} className={cfg.color} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 bg-card rounded-xl border p-4 mb-4', draft.status === 'superseded' ? 'opacity-60' : '')}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm font-display">{draft.label}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', cfg.bg, cfg.color)}>
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
              {draft.created_date && <span>Created {format(new Date(draft.created_date), 'MMM d, yyyy h:mm a')}</span>}
              {draft.created_by && <span>by {draft.created_by}</span>}
            </div>
          </div>
          <span className="text-lg font-bold font-display shrink-0">
            ${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Approval details */}
        {draft.status === 'approved' && draft.approved_by && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} className="text-green-600" />
            <p className="text-xs text-green-700">
              Approved by <span className="font-semibold">{draft.approved_by}</span>
              {draft.approved_at && <> on {format(new Date(draft.approved_at), 'MMM d, yyyy h:mm a')}</>}
            </p>
          </div>
        )}

        {/* Rejection reason */}
        {draft.status === 'rejected' && draft.notes && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2">
            <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700"><span className="font-semibold">Reason:</span> {draft.notes}</p>
          </div>
        )}

        {/* Line item summary */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
            <p className="text-xs text-muted-foreground">Line Items</p>
            <p className="text-sm font-semibold">{draft.line_items?.length || 0}</p>
          </div>
          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="text-sm font-semibold">${(draft.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
            <p className="text-xs text-muted-foreground">Modifier</p>
            <p className="text-sm font-semibold">×{draft.modifier_total?.toFixed(2) || '1.00'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobApprovals({ job }) {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['estimates', job.id],
    queryFn: () => base44.entities.EstimateDraft.filter({ job_id: job.id, is_deleted: false }, '-version_number'),
  });

  // Approval flow status summary
  const active = drafts.find((d) => ['submitted', 'approved', 'locked'].includes(d.status));
  const pendingApproval = drafts.filter((d) => d.status === 'submitted');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold font-display">Approval History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Full version history and approval chain for this job's estimates</p>
        </div>
        {pendingApproval.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
            <AlertCircle size={13} />
            {pendingApproval.length} estimate{pendingApproval.length > 1 ? 's' : ''} awaiting approval
            {!isManager && ' — manager required'}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : drafts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center gap-3 min-h-[220px]">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
            <FileCheck size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold font-display">No estimates yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Generate an estimate in the Estimates tab. Once submitted, approval history will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div>
          {drafts.map((draft, i) => (
            <TimelineEntry key={draft.id} draft={draft} isLast={i === drafts.length - 1} />
          ))}
        </div>
      )}

      {/* Role note */}
      {drafts.length > 0 && !isManager && (
        <p className="text-xs text-muted-foreground text-center">
          Only managers and admins can approve or lock estimates.
        </p>
      )}
    </div>
  );
}