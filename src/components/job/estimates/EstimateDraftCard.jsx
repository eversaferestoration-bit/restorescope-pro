import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronDown, ChevronUp, RefreshCw, Loader2, Lock, Send, CheckCircle2, XCircle, GitBranch, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import EstimateLineItemRow from './EstimateLineItemRow';
import EstimateModifiersBadge from './EstimateModifiersBadge';

export const STATUS_COLORS = {
  draft:     'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  locked:    'bg-slate-200 text-slate-600',
  rejected:  'bg-red-100 text-red-700',
  superseded:'bg-muted text-muted-foreground',
};

export const STATUS_ICONS = {
  draft:     null,
  submitted: Send,
  approved:  CheckCircle2,
  locked:    Lock,
  rejected:  XCircle,
};

function RejectionModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-sm p-5 space-y-4">
        <h2 className="font-semibold font-display">Reject Estimate</h2>
        <div>
          <label className="text-xs font-medium">Reason for rejection</label>
          <textarea
            rows={3}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Explain why this estimate is being rejected…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="px-3 h-8 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EstimateDraftCard({ draft, jobId, readOnly }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(['draft', 'submitted'].includes(draft.status));
  const [lineItems, setLineItems] = useState(draft.line_items || []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isLocked = draft.status === 'locked';
  const isEditable = draft.status === 'draft' && !readOnly;
  const isSuperseded = draft.status === 'superseded';

  const handleAction = async (action, extra = {}) => {
    setActionLoading(true);
    setErr('');
    try {
      const res = await base44.functions.invoke('approveEstimate', { draft_id: draft.id, action, ...extra });
      if (res.data?.error) {
        setErr(res.data.error);
      } else {
        qc.invalidateQueries(['estimates', jobId]);
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Action failed.';
      setErr(msg);
    }
    setActionLoading(false);
  };

  const handleRecalculate = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await base44.functions.invoke('recalculateEstimateDraft', { draft_id: draft.id, line_items: lineItems });
      if (res.data.error) {
        setErr(res.data.message || res.data.error);
      } else {
        setLineItems(res.data.draft.line_items || lineItems);
        qc.invalidateQueries(['estimates', jobId]);
      }
    } catch (e) {
      setErr('Recalculate failed.');
    }
    setSaving(false);
  };

  const handleLineItemSave = (updated) => {
    setLineItems((prev) => prev.map((i) => i.scope_item_id === updated.scope_item_id ? updated : i));
  };

  // Group by room
  const byRoom = {};
  for (const item of lineItems) {
    const key = item.room_name || 'General';
    if (!byRoom[key]) byRoom[key] = [];
    byRoom[key].push(item);
  }

  const StatusIcon = STATUS_ICONS[draft.status];

  return (
    <>
      {showRejectModal && (
        <RejectionModal
          onConfirm={(reason) => { setShowRejectModal(false); handleAction('reject', { rejection_reason: reason }); }}
          onCancel={() => setShowRejectModal(false)}
        />
      )}

      <div className={cn('bg-card rounded-xl border overflow-hidden transition-all', isSuperseded ? 'opacity-50 border-border' : 'border-border')}>
        {/* Header */}
        <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between px-4 py-3.5 hover:bg-muted/30 transition">
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm font-display">{draft.label}</span>
              <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[draft.status] || 'bg-muted text-muted-foreground')}>
                {StatusIcon && <StatusIcon size={10} />}
                {draft.status.replace(/_/g, ' ')}
              </span>
              {isLocked && <Lock size={12} className="text-slate-400" title="Locked — read only" />}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{lineItems.length} line items</span>
              {draft.created_date && <span className="text-xs text-muted-foreground">{format(new Date(draft.created_date), 'MMM d, yyyy')}</span>}
              {draft.approved_by && <span className="text-xs text-muted-foreground">Approved by {draft.approved_by}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-bold font-display">${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
          </div>
        </button>

        {open && (
          <div className="border-t border-border">
            {/* Locked banner */}
            {isLocked && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-border text-xs text-slate-600">
                <Lock size={12} /> This estimate is locked. Create a new version to make changes.
              </div>
            )}

            {/* Rejection note */}
            {draft.status === 'rejected' && draft.notes && (
              <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border-b border-border text-xs text-red-700">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span><strong>Rejected:</strong> {draft.notes}</span>
              </div>
            )}

            {/* Modifiers */}
            {draft.applied_modifiers && Object.keys(draft.applied_modifiers).length > 0 && (
              <div className="px-4 py-2.5 bg-muted/20 border-b border-border flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">Modifiers:</span>
                <EstimateModifiersBadge modifiers={draft.applied_modifiers} />
                <span className="text-xs text-muted-foreground ml-auto">×{draft.modifier_total?.toFixed(2)}</span>
              </div>
            )}

            {/* Line items by room */}
            {Object.entries(byRoom).map(([roomName, items]) => (
              <div key={roomName}>
                <div className="px-4 py-1.5 bg-muted/20 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{roomName}</span>
                </div>
                {items.map((item, idx) => (
                  <EstimateLineItemRow key={item.scope_item_id || idx} item={item} onSave={handleLineItemSave} readOnly={!isEditable} />
                ))}
              </div>
            ))}

            {/* Totals */}
            <div className="px-4 py-3 border-t border-border bg-muted/10 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${(draft.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {draft.modifier_total !== 1.0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Modifier</span>
                  <span>×{draft.modifier_total?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border mt-1">
                <span>Total</span>
                <span>${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {err && (
              <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle size={12} /> {err}
              </div>
            )}

            {/* Action bar */}
            {!isSuperseded && (
              <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
                {/* DRAFT actions */}
                {draft.status === 'draft' && !readOnly && (
                  <>
                    <button onClick={handleRecalculate} disabled={saving} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs font-medium hover:bg-muted transition disabled:opacity-60">
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {saving ? 'Recalculating…' : 'Save & Recalculate'}
                    </button>
                    <button onClick={() => handleAction('submit')} disabled={actionLoading} className="ml-auto inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition disabled:opacity-60">
                      <Send size={12} /> Submit for Approval
                    </button>
                  </>
                )}

                {/* SUBMITTED actions — manager only */}
                {draft.status === 'submitted' && (
                  <>
                    {!readOnly && (
                      <button onClick={() => handleAction('reopen')} disabled={actionLoading} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition disabled:opacity-60">
                        Return to Draft
                      </button>
                    )}
                    {isManager && (
                      <>
                        <button onClick={() => setShowRejectModal(true)} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/10 transition disabled:opacity-60 ml-auto">
                          <XCircle size={12} /> Reject
                        </button>
                        <button onClick={() => handleAction('approve')} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition disabled:opacity-60">
                          <CheckCircle2 size={12} /> Approve
                        </button>
                      </>
                    )}
                    {!isManager && (
                      <span className="ml-auto text-xs text-muted-foreground italic">Awaiting manager approval</span>
                    )}
                  </>
                )}

                {/* APPROVED actions */}
                {draft.status === 'approved' && (
                  <>
                    {isManager && (
                      <button onClick={() => handleAction('lock')} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-60">
                        <Lock size={12} /> Lock Estimate
                      </button>
                    )}
                    <button onClick={() => handleAction('new_version')} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs font-medium hover:bg-muted transition disabled:opacity-60 ml-auto">
                      <GitBranch size={12} /> New Version
                    </button>
                  </>
                )}

                {/* LOCKED actions */}
                {draft.status === 'locked' && (
                  <button onClick={() => handleAction('new_version')} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs font-medium hover:bg-muted transition disabled:opacity-60 ml-auto">
                    <GitBranch size={12} /> New Version
                  </button>
                )}

                {/* REJECTED actions */}
                {draft.status === 'rejected' && !readOnly && (
                  <button onClick={() => handleAction('reopen')} disabled={actionLoading} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                    Return to Draft
                  </button>
                )}

                {actionLoading && <Loader2 size={14} className="animate-spin text-muted-foreground ml-2" />}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}