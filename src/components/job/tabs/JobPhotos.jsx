import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOfflinePhotoQueue } from '@/hooks/useOfflinePhotoQueue';
import { Upload, X, ImageIcon, Loader2, Cloud, CloudOff, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import RoomPicker from '@/components/job/RoomPicker';
import SyncStatusBar from '@/components/job/SyncStatusBar';
import PhotoAnalysisPanel from '@/components/job/PhotoAnalysisPanel';
import { cn } from '@/lib/utils';

const SYNC_STATUS_ICON = {
  local_only: { icon: CloudOff, color: 'text-amber-500', label: 'Local only' },
  queued: { icon: Clock, color: 'text-blue-500', label: 'Queued' },
  uploading: { icon: Loader2, color: 'text-blue-500', label: 'Uploading…', spin: true },
  uploaded: { icon: CheckCircle2, color: 'text-green-500', label: 'Uploaded' },
  analysis_pending: { icon: Cloud, color: 'text-muted-foreground', label: 'Analysis pending' },
  failed: { icon: X, color: 'text-destructive', label: 'Failed' },
};

function PhotoStatusBadge({ status }) {
  const cfg = SYNC_STATUS_ICON[status] || SYNC_STATUS_ICON['uploaded'];
  const Icon = cfg.icon;
  return (
    <div className={cn('absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/60 rounded-full px-1.5 py-0.5', cfg.color)}>
      <Icon size={10} className={cfg.spin ? 'animate-spin' : ''} />
    </div>
  );
}

export default function JobPhotos({ job }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef();
  const [lightbox, setLightbox] = useState(null);
  const [roomId, setRoomId] = useState(null);

  const { isOnline, pendingCount, failedCount, enqueue, syncPending, retryFailed, queueForJob } = useOfflinePhotoQueue();
  const localQueue = queueForJob(job.id).filter((i) => i.status !== 'uploaded');

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', job.id],
    queryFn: () => base44.entities.Room.filter({ job_id: job.id, is_deleted: false }, 'sort_order'),
  });

  const [photoPage, setPhotoPage] = useState(0);
  const PHOTO_PAGE_SIZE = 24;

  const { data: photos = [], isLoading, isFetching } = useQuery({
    queryKey: ['photos', job.id, roomId, photoPage],
    queryFn: async () => {
      const allPhotos = await base44.entities.Photo.filter({
        job_id: job.id,
        is_deleted: false,
        ...(roomId ? { room_id: roomId } : {}),
      }, '-created_date', 200);
      return allPhotos.slice(photoPage * PHOTO_PAGE_SIZE, (photoPage + 1) * PHOTO_PAGE_SIZE);
    },
    refetchInterval: pendingCount > 0 ? 3000 : false,
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Photo.update(id, { is_deleted: true }),
    onSuccess: () => qc.invalidateQueries(['photos', job.id]),
  });

  const handleFiles = async (files) => {
    if (!files?.length) return;
    await enqueue(files, {
      jobId: job.id,
      roomId,
      companyId: job.company_id,
      takenBy: user?.email,
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="space-y-4">
      <SyncStatusBar
        isOnline={isOnline}
        pendingCount={pendingCount}
        failedCount={failedCount}
        onSync={syncPending}
        onRetry={retryFailed}
      />

      {/* Room filter */}
      <RoomPicker rooms={rooms} selectedId={roomId} onSelect={(id) => setRoomId(id === roomId ? null : id)} />

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-accent/20 transition"
      >
        <Upload size={22} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Tap to add photos{!isOnline ? ' (will sync when online)' : ''}
        </p>
        {roomId && <p className="text-xs text-primary font-medium">Assigning to selected room</p>}
        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* Local queue preview */}
      {localQueue.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pending Upload</p>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {localQueue.map((item) => (
              <div key={item.localId} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                {item.dataUrl && (
                  <img src={item.dataUrl} alt="pending" className="w-full h-full object-cover opacity-70" />
                )}
                <PhotoStatusBadge status={item.status} />
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Loader2 size={18} className="text-white animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded photos */}
      {isLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((i) => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : photos.length === 0 && localQueue.length === 0 ? (
        <div className="text-center py-6">
          <ImageIcon size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No photos yet.</p>
        </div>
      ) : photos.length > 0 && (
        <div>
          {localQueue.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Uploaded</p>
          )}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={p.thumbnail_url || p.file_url}
                  alt={p.caption || 'photo'}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(p)}
                  loading="lazy"
                  decoding="async"
                />
                <PhotoStatusBadge status={p.analysis_status === 'analysis_complete' ? 'uploaded' : (p.sync_status || 'uploaded')} />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          
          {/* Load more photos */}
          {!isFetching && photos.length === PHOTO_PAGE_SIZE && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setPhotoPage(p => p + 1)}
                className="px-4 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 overflow-y-auto">
          {/* Click backdrop to close */}
          <div className="absolute inset-0" onClick={() => setLightbox(null)} />
          <div className="relative z-10 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition z-20"
            >
              <X size={14} className="text-white" />
            </button>
            <img src={lightbox.file_url} className="w-full rounded-xl object-contain max-h-[55vh]" loading="lazy" />
            <div className="mt-2">
              {lightbox.caption && <p className="text-white text-sm text-center">{lightbox.caption}</p>}
              <p className="text-white/50 text-xs text-center mt-0.5">{lightbox.taken_by}</p>
              <PhotoAnalysisPanel photo={lightbox} jobId={job.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}