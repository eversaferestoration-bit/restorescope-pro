import { useState } from 'react';
import { X } from 'lucide-react';

export default function RejectModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold font-display text-sm">Reject Estimate</h2>
          <button onClick={onCancel}><X size={15} className="text-muted-foreground" /></button>
        </div>
        <div>
          <label className="text-xs font-medium">Rejection Reason</label>
          <textarea
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this estimate is being rejected…"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="px-3 h-8 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition disabled:opacity-50"
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}