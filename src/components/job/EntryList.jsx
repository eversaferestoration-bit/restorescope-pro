import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

/**
 * Generic reusable list for field-capture entries.
 * rows: [{id, primary, secondary, meta, ts}]
 * canDelete: bool
 * onDelete: fn(id)
 */
export default function EntryList({ rows, canDelete, onDelete, emptyMsg = 'No entries yet.' }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-3 text-center">{emptyMsg}</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-3 bg-muted/30 rounded-lg px-3 py-2.5 border border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{row.primary}</span>
              {row.badge && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">{row.badge}</span>
              )}
            </div>
            {row.secondary && <p className="text-xs text-muted-foreground mt-0.5 truncate">{row.secondary}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">
              {row.recorded_by && <span>{row.recorded_by} · </span>}
              {row.ts && format(new Date(row.ts), 'MMM d, h:mm a')}
            </p>
          </div>
          {canDelete && (
            <button
              onClick={() => onDelete(row.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition shrink-0"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}