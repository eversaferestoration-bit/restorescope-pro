import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronDown, ChevronUp, RefreshCw, Loader2, Lock, GitBranch, Shield, MessageSquare, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import EstimateLineItemRow from './EstimateLineItemRow';
import EstimateModifiersBadge from './EstimateModifiersBadge';
import RejectModal from './RejectModal';
import ClaimDefensePanel from './ClaimDefensePanel';
import CarrierResponseGenerator from './CarrierResponseGenerator';
import OptimizationPanel from './OptimizationPanel';
import MarketComparisonPanel from './MarketComparisonPanel';

const STATUS_COLORS = {
  draft:     'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  locked:    'bg-slate-200 text-slate-600',
  rejected:  'bg-red-100 text-red-700',
  superseded:'bg-muted text-muted-foreground',
};

export default function EstimateDraftCard({ draft, jobId, readOnly }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(draft.status === 'draft');
  const [lineItems, setLineItems] = useState(draft.line_items || []);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [err, setErr] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'defense' | 'carrier_response' | 'optimize'
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState(null);

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isLocked = draft.status === 'locked';
  const isEditable = draft.status === 'draft' && !readOnly;
  const canEdit = !isLocked && !readOnly;

  const invalidate = () => qc.invalidateQueries(['estimates', jobId]);

  const doAction = async (action, extra = {}) => {
    setActionLoading(action);
    setErr('');
    try {
      const res = await base44.functions.invoke('approveEstimate', { draft_id: draft.id, action, ...extra });
      if (res.data.error) setErr(res.data.error);
      else invalidate();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Action failed.';
      setErr(msg);
    }
    setActionLoading(null);
  };

  const handleLineItemSave = (updated) => {
    setLineItems((prev) => prev.map((i) => i.scope_item_id === updated.scope_item_id ? updated : i));
  };

  const handleRecalculate = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await base44.functions.invoke('recalculateEstimateDraft', { draft_id: draft.id, line_items: lineItems });
      if (res.data.error) setErr(res.data.message || res.data.error);
      else { setLineItems(res.data.draft.line_items || lineItems); invalidate(); }
    } catch (e) {
      setErr('Recalculate failed.');
    }
    setSaving(false);
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimization(null);
    setErr('');
    try {
      const res = await base44.functions.invoke('optimizeEstimate', { estimate_version_id: draft.id });
      setOptimization(res.data);
      setActiveTab('optimize');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Optimization failed.');
    }
    setOptimizing(false);
  };

  // Group line items by room
  const byRoom = {};
  for (const item of lineItems) {
    const key = item.room_name || 'General';
    if (!byRoom[key]) byRoom[key] = [];
    byRoom[key].push(item);
  }

  const ActionBtn = ({ action, label, color, disabled }) => (
    <button
      onClick={() => doAction(action)}
      disabled={!!actionLoading || disabled}
      className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition disabled:opacity-60', color)}
    >
      {actionLoading === action ? <Loader2 size={12} className="animate-spin inline" /> : label}
    </button>
  );

  return (
    <div className={cn('bg-card rounded-xl border overflow-hidden transition-all', draft.status === 'superseded' ? 'opacity-50 border-border' : draft.status === 'locked' ? 'border-slate-300' : 'border-border')}>
      {/* Header */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between px-4 py-3.5 hover:bg-muted/30 transition">
        <div className="text-left">
          <div className="flex items-center gap-2 flex-wrap">
            {isLocked && <Lock size={13} className="text-slate-500" />}
            <span className="font-semibold text-sm font-display">{draft.label}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[draft.status] || 'bg-muted text-muted-foreground')}>
              {draft.status.replace(/_/g, ' ')}
            </span>
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
          {/* Sub-tabs */}
          <div className="flex border-b border-border bg-muted/20">
            <button
              onClick={() => setActiveTab('details')}
              className={cn('px-4 py-2 text-xs font-semibold transition', activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('defense')}
              className={cn('inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition', activeTab === 'defense' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              <Shield size={11} /> Defense
            </button>
            <button
              onClick={() => setActiveTab('carrier_response')}
              className={cn('inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition', activeTab === 'carrier_response' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              <MessageSquare size={11} /> Carrier Response
            </button>
            <button
              onClick={() => setActiveTab('optimize')}
              className={cn('inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition', activeTab === 'optimize' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              <TrendingUp size={11} /> Optimize
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={cn('inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition', activeTab === 'market' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              <BarChart3 size={11} /> Market
            </button>
          </div>

          {activeTab === 'defense' && <ClaimDefensePanel draft={draft} />}

          {activeTab === 'carrier_response' && <CarrierResponseGenerator estimateVersionId={draft.id} />}

          {activeTab === 'optimize' && (
            <div className="p-4 space-y-4">
              {!optimization && !optimizing && (
                <div className="text-center py-8">
                  <TrendingUp size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click "Run Optimization" to analyze this estimate</p>
                  <p className="text-xs text-muted-foreground mt-1">Finds pricing improvements, missing modifiers, and margin opportunities</p>
                  <button
                    onClick={handleOptimize}
                    className="mt-3 inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
                  >
                    <TrendingUp size={14} /> Run Optimization
                  </button>
                </div>
              )}

              {optimizing && (
                <div className="text-center py-8">
                  <Loader2 size={32} className="mx-auto text-primary animate-spin mb-2" />
                  <p className="text-sm font-medium">Analyzing estimate for optimization opportunities…</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take 10–15 seconds</p>
                </div>
              )}

              {optimization && (
                <OptimizationPanel optimization={optimization} estimate={draft} />
              )}
            </div>
          )}

          {activeTab === 'market' && (
            <div className="p-4">
              <MarketComparisonPanel estimateId={draft.id} />
            </div>
          )}

          {activeTab === 'details' && (
          <div>
          {/* Lock notice */}
          {isLocked && (
            <div className="px-4 py-2.5 bg-slate-50 border-b border-border flex items-center gap-2 text-xs text-slate-600">
              <Lock size={12} /> This estimate is locked. Create a new version to make changes.
            </div>
          )}

          {/* Rejection note */}
          {draft.status === 'rejected' && draft.notes && (
            <div className="px-4 py-2.5 bg-red-50 border-b border-border text-xs text-red-700">
              <span className="font-semibold">Rejection reason:</span> {draft.notes}
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

          {/* Line items grouped by room */}
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

          {err && <div className="px-4 pb-2 text-xs text-destructive font-medium">{err}</div>}

          {/* Actions */}
          {!readOnly && (
            <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
              {/* draft: save + submit */}
              {draft.status === 'draft' && (
                <>
                  <button onClick={handleRecalculate} disabled={saving} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition disabled:opacity-60">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {saving ? 'Recalculating…' : 'Save & Recalculate'}
                  </button>
                  <ActionBtn action="submit" label="Submit for Approval" color="bg-amber-500 hover:bg-amber-600 text-white ml-auto" />
                </>
              )}

              {/* submitted: manager can approve/reject; anyone can pull back */}
              {draft.status === 'submitted' && (
                <>
                  <ActionBtn action="reopen" label="Return to Draft" color="border border-border hover:bg-muted text-foreground" />
                  {isManager && (
                    <>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={!!actionLoading}
                        className="px-3 h-8 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition disabled:opacity-60 ml-auto"
                      >
                        Reject
                      </button>
                      <ActionBtn action="approve" label="Approve" color="bg-green-600 hover:bg-green-700 text-white" />
                    </>
                  )}
                  {!isManager && <span className="ml-auto text-xs text-muted-foreground">Awaiting manager approval</span>}
                </>
              )}

              {/* approved: lock or new version */}
              {draft.status === 'approved' && (
                <>
                  {isManager && <ActionBtn action="lock" label="Lock Estimate" color="bg-slate-700 hover:bg-slate-800 text-white" />}
                  <ActionBtn action="new_version" label={<span className="inline-flex items-center gap-1"><GitBranch size={11} /> New Version</span>} color="border border-border hover:bg-muted text-foreground ml-auto" />
                </>
              )}

              {/* locked: can only create new version */}
              {draft.status === 'locked' && (
                <ActionBtn action="new_version" label={<span className="inline-flex items-center gap-1"><GitBranch size={11} /> New Version</span>} color="border border-border hover:bg-muted text-foreground ml-auto" />
              )}

              {/* rejected: reopen as draft */}
              {draft.status === 'rejected' && (
                <ActionBtn action="reopen" label="Reopen as Draft" color="border border-border hover:bg-muted text-foreground" />
              )}
            </div>
          )}
          </div>
          )}
        </div>
      )}

      {showRejectModal && (
        <RejectModal
          onConfirm={(reason) => { setShowRejectModal(false); doAction('reject', { rejection_reason: reason }); }}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </div>
  );
}