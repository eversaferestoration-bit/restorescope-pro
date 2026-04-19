import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  containment: 'bg-purple-100 text-purple-700',
  demolition: 'bg-red-100 text-red-700',
  drying: 'bg-blue-100 text-blue-700',
  cleaning: 'bg-green-100 text-green-700',
  deodorization: 'bg-amber-100 text-amber-700',
  hepa: 'bg-teal-100 text-teal-700',
  contents: 'bg-orange-100 text-orange-700',
  documentation: 'bg-muted text-muted-foreground',
};

export default function EstimateLineItemRow({ item, onSave, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.quantity);
  const [cost, setCost] = useState(item.unit_cost);
  const [reason, setReason] = useState(item.override_reason || '');
  const [err, setErr] = useState('');

  const isOverridden = item.override_reason?.trim();

  const handleSave = () => {
    const qtyChanged = Number(qty) !== item.quantity;
    const costChanged = Number(cost) !== item.unit_cost;
    if ((qtyChanged || costChanged) && !reason.trim()) {
      setErr('Override reason required');
      return;
    }
    setErr('');
    onSave({ ...item, quantity: Number(qty), unit_cost: Number(cost), override_reason: reason.trim() || null });
    setEditing(false);
  };

  const handleCancel = () => {
    setQty(item.quantity);
    setCost(item.unit_cost);
    setReason(item.override_reason || '');
    setErr('');
    setEditing(false);
  };

  const lineTotal = Number(qty) * Number(cost);

  return (
    <div className={cn('group border-b border-border last:border-0', isOverridden && 'bg-amber-50/40')}>
      {!editing ? (
        <div className="flex items-start gap-2 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', CATEGORY_COLORS[item.category] || 'bg-muted text-muted-foreground')}>
                {item.category}
              </span>
              {isOverridden && <span className="text-xs text-amber-600 font-medium">Overridden</span>}
            </div>
            <p className="text-sm mt-0.5">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.room_name} · {item.quantity} {item.unit} @ ${item.unit_cost.toFixed(2)}</p>
            {isOverridden && <p className="text-xs text-amber-600 italic mt-0.5">{item.override_reason}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold">${item.line_total.toFixed(2)}</p>
            {!readOnly && (
              <button onClick={() => setEditing(true)} className="mt-1 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition ml-auto">
                <Pencil size={11} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-2 bg-accent/20">
          <p className="text-xs font-medium truncate">{item.description}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Qty</label>
              <input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(e.target.value)}
                className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Unit Cost ($)</label>
              <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)}
                className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Override Reason {(Number(qty) !== item.quantity || Number(cost) !== item.unit_cost) && <span className="text-destructive">*</span>}</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for change…"
                className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">New total: ${lineTotal.toFixed(2)}</p>
            <div className="flex gap-1">
              <button onClick={handleCancel} className="h-7 px-2 rounded border text-xs hover:bg-muted transition"><X size={11} /></button>
              <button onClick={handleSave} className="h-7 px-2 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition"><Check size={11} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}