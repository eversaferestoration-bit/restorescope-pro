import { ClipboardList } from 'lucide-react';

export default function AuditLog() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Full history of all actions in your account</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search events…"
              className="h-8 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition flex-1 max-w-xs"
            />
          </div>
        </div>

        <div className="p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[260px]">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <ClipboardList size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold font-display">No events yet</p>
            <p className="text-sm text-muted-foreground mt-1">Audit events will appear here as actions are performed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}