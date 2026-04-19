import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function JobPhotos({ job }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['photos', job.id],
    queryFn: () => base44.entities.Photo.filter({ job_id: job.id, is_deleted: false }, '-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Photo.update(id, { is_deleted: true }),
    onSuccess: () => qc.invalidateQueries(['photos', job.id]),
  });

  const handleFiles = async (files) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Photo.create({
        company_id: job.company_id,
        job_id: job.id,
        file_url,
        mime_type: file.type,
        file_size: file.size,
        taken_by: user?.email,
        taken_at: new Date().toISOString(),
        sync_status: 'synced',
        analysis_status: 'pending',
        is_deleted: false,
      });
    }
    qc.invalidateQueries(['photos', job.id]);
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-accent/20 transition"
      >
        {uploading ? (
          <Loader2 size={24} className="text-primary animate-spin" />
        ) : (
          <Upload size={22} className="text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">{uploading ? 'Uploading…' : 'Tap to upload photos'}</p>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-6">
          <ImageIcon size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No photos yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={p.file_url}
                alt={p.caption || 'photo'}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(p.file_url)}
              />
              <button
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}