import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function ScopeSummaryBar({ items }) {
  const confirmed = items.filter((i) => i.status === 'confirmed').length;
  const suggested = items.filter((i) => i.status === 'suggested').length;
  const rejected = items.filter((i) => i.status === 'rejected').length;

  if (!items.length) return null;

  return (
    <div className="flex items-center gap-4 bg-muted/40 rounded-lg px-4 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 text-green-600 font-medium">
        <CheckCircle2 size={13} /> {confirmed} confirmed
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock size={13} /> {suggested} pending
      </div>
      {rejected > 0 && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <XCircle size={13} /> {rejected} rejected
        </div>
      )}
    </div>
  );
}