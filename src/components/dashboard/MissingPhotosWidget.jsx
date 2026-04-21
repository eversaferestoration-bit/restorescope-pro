import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, AlertCircle } from 'lucide-react';

export default function MissingPhotosWidget() {
  // Get active jobs
  const { data: jobs = [], isLoading: loadingJobs, error: jobsError } = useQuery({
    queryKey: ['dashboard-active-jobs-photos'],
    queryFn: () => base44.entities.Job.filter({ is_deleted: false }, '-created_date', 30),
  });

  // Get all photos to cross-reference
  const { data: photos = [], isLoading: loadingPhotos, error: photosError } = useQuery({
    queryKey: ['dashboard-all-photos'],
    queryFn: () => base44.entities.Photo.filter({ is_deleted: false }, '-created_date', 200),
  });

  const isLoading = loadingJobs || loadingPhotos;

  // Gracefully handle permission errors
  if (jobsError || photosError) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">Unable to load missing photos</p>
      </div>
    );
  }

  const activeJobs = jobs.filter(j => ['new', 'in_progress'].includes(j.status));
  const photosPerJob = {};
  for (const p of photos) {
    if (p.job_id) photosPerJob[p.job_id] = (photosPerJob[p.job_id] || 0) + 1;
  }

  const missingPhotoJobs = activeJobs.filter(j => !photosPerJob[j.id]);

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-purple-500" />
          <span className="text-sm font-semibold font-display">Missing Photos</span>
        </div>
        {missingPhotoJobs.length > 0 && (
          <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{missingPhotoJobs.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="p-3 space-y-2">{[1,2].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : missingPhotoJobs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">All active jobs have photos.</div>
      ) : (
        <div className="divide-y divide-border">
          {missingPhotoJobs.slice(0, 5).map((j) => (
            <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{j.job_number || `Job #${j.id?.slice(-6)}`}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{j.loss_type || 'Unknown type'} · {j.status?.replace(/_/g,' ')}</p>
              </div>
              <ChevronRight size={13} className="text-muted-foreground group-hover:text-primary shrink-0" />
            </Link>
          ))}
          {missingPhotoJobs.length > 5 && (
            <div className="px-4 py-2 text-xs text-muted-foreground">+{missingPhotoJobs.length - 5} more</div>
          )}
        </div>
      )}
    </div>
  );
}