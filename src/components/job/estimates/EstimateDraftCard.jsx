import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import EstimateLineItemRow from './EstimateLineItemRow';
import EstimateModifiersBadge from './EstimateModifiersBadge';

const STATUS_COLORS = {
  draft: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  superseded: 'bg-muted text-muted-foreground',
};

export default function EstimateDraftCard({ draft, jobId, readOnly }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(draft.status === 'draft');
  const [lineItems, setLineItems] = useState(draft.line_items || []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const statusMutation = useMutation({
    mutationFn: ({ status }) => base44.entities.EstimateDraft.update(draft.id, { status }),
    onSuccess: () => qc.invalidateQueries(['estimates', jobId]),
  });

  const handleLineItemSave = (updated) => {
    setLineItems((prev) => prev.map((i) => i.scope_item_id === updated.scope_item_id ? updated : i));
  };

  const handleRecalculate = async () => {
    setSaving(true);
    setErr('');
    const res = await base44.functions.invoke('recalculateEstimateDraft', { draft_id: draft.id, line_items: lineItems });
    if (res.data.error) {
      setErr(res.data.message || res.data.error);
    } else {
      setLineItems(res.data.draft.line_items || lineItems);
      qc.invalidateQueries(['estimates', jobId]);
    }
    setSaving(false);
  };

  // Group line items by room
  const byRoom = {};
  for (const item of lineItems) {
    const key = item.room_name || 'General';
    if (!byRoom[key]) byRoom[key] = [];
    byRoom[key].push(item);
  }

  const isEditable = draft.status === 'draft';

  return (
    <div className={cn('bg-card rounded-xl border overflow-hidden transition-all', draft.status === 'superseded' ? 'opacity-60 border-border' : 'border-border')}>
      {/* Header */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between px-4 py-3.5 hover:bg-muted/30 transition">
        <div className="text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm font-display">{draft.label}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[draft.status] || 'bg-muted text-muted-foreground')}>
              {draft.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{lineItems.length} line items</span>
            {draft.created_date && <span className="text-xs text-muted-foreground">{format(new Date(draft.created_date), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-lg font-bold font-display">${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Modifiers */}
          {draft.applied_modifiers && Object.keys(draft.applied_modifiers).length > 0 && (
            <div className="px-4 py-2.5 bg-muted/20 border-b border-border flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Modifiers:</span>
              <EstimateModifiersBadge modifiers={draft.applied_modifiers} />
              <span className="text-xs text-muted-foreground ml-auto">×{draft.modifier_total?.toFixed(2)}</span>
            </div>
          )}

          {/* Line items grouped by room */}
          {Object.entries(byRoom).map(([roomName, items]) => (
            <div key={roomName}>
              <div className="px-4 py-1.5 bg-muted/20 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{roomName}</span>
              </div>
              {items.map((item, idx) => (
                <EstimateLineItemRow key={item.scope_item_id || idx} item={item} onSave={handleLineItemSave} readOnly={!isEditable || readOnly} />
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

          {err && <div className="px-4 pb-3 text-xs text-destructive">{err}</div>}

          {/* Actions */}
          {!readOnly && isEditable && (
            <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
              <button onClick={handleRecalculate} disabled={saving} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {saving ? 'Recalculating…' : 'Save & Recalculate'}
              </button>
              <button onClick={() => statusMutation.mutate({ status: 'pending_review' })} className="px-3 h-8 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition ml-auto">
                Submit for Review
              </button>
            </div>
          )}
          {!readOnly && draft.status === 'pending_review' && (
            <div className="px-4 py-3 border-t border-border flex items-center gap-2">
              <button onClick={() => statusMutation.mutate({ status: 'draft' })} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Return to Draft</button>
              <button onClick={() => statusMutation.mutate({ status: 'approved' })} className="ml-auto px-3 h-8 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition">Approve</button>
              <button onClick={() => statusMutation.mutate({ status: 'rejected' })} className="px-3 h-8 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition">Reject</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}