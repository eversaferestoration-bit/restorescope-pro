import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';

export default function DamageScanUploader({ photos, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return file_url;
        })
      );
      onChange([...photos, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const remove = (url) => onChange(photos.filter(p => p !== url));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition hover:border-orange-500/60"
        style={{ borderColor: '#1e2d45', background: '#0a1020' }}
      >
        {uploading ? (
          <Loader2 size={28} className="animate-spin" style={{ color: '#e05a1c' }} />
        ) : (
          <Upload size={28} style={{ color: '#3a5a7c' }} />
        )}
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {uploading ? 'Uploading…' : 'Drop photos here or click to browse'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>
            JPG, PNG, HEIC accepted — upload multiple at once
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border" style={{ borderColor: '#1e2d45' }}>
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => remove(url)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                style={{ background: '#dc2626' }}
              >
                <X size={10} className="text-white" />
              </button>
              <div className="absolute bottom-1 left-1 text-[9px] px-1 rounded"
                style={{ background: '#00000080', color: '#fff' }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="flex items-center gap-2 text-xs" style={{ color: '#3a5a7c' }}>
          <ImageIcon size={12} /> No photos uploaded yet
        </div>
      )}
    </div>
  );
}