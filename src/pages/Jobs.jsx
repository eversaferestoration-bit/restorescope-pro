import { Link } from 'react-router-dom';
import { FolderOpen, Plus } from 'lucide-react';

export default function Jobs() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">All restoration jobs</p>
        </div>
        <Link
          to="/jobs/new"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          <Plus size={15} />
          New Job
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <FolderOpen size={24} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold font-display">No jobs yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first job to get started.</p>
        </div>
        <Link
          to="/jobs/new"
          className="mt-2 inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus size={14} /> Create Job
        </Link>
      </div>
    </div>
  );
}