import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Download, Trash2, File } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function LeadDocuments({ lead }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['lead-documents', lead.id],
    queryFn: () => base44.entities.LeadDocument.filter({
      lead_id: lead.id,
      is_deleted: false,
    }, '-created_date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadDocument.update(id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-documents', lead.id] });
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.LeadDocument.create({
          company_id: lead.company_id,
          lead_id: lead.id,
          file_name: file.name,
          file_url,
          file_type: file.type,
          document_type: 'other',
          uploaded_by: 'current_user',
          uploaded_by_name: 'User',
        });
      }
      qc.invalidateQueries({ queryKey: ['lead-documents', lead.id] });
      toast({ title: `✅ ${files.length} file(s) uploaded` });
    } catch (err) {
      toast({
        title: '❌ Upload failed',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6 bg-card">
        <label className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted transition">
          <Upload size={28} className="text-muted-foreground mb-2" />
          <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Click to upload documents'}</span>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded</p>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition">
              <File size={20} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary transition truncate block">
                  {doc.file_name}
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  {doc.uploaded_by_name} • {new Date(doc.created_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={doc.file_url}
                  download
                  className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-primary">
                  <Download size={16} />
                </a>
                <button
                  onClick={() => deleteMutation.mutate(doc.id)}
                  className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-destructive">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}