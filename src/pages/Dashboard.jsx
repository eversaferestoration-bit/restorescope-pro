import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome to RestoreScope Pro</p>
      </div>

      {/* Summary cards — skeleton ready for real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Jobs', value: '—' },
          { label: 'Open Estimates', value: '—' },
          { label: 'Pending Approvals', value: '—' },
          { label: 'Exports This Month', value: '—' },
        ].map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className="text-2xl font-bold font-display text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder content area */}
      <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[260px]">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <LayoutDashboard size={24} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold font-display text-foreground">No jobs yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first job to get started.</p>
        </div>
        <a
          href="/jobs/new"
          className="mt-2 inline-flex items-center px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
        >
          Create Job
        </a>
      </div>
    </div>
  );
}