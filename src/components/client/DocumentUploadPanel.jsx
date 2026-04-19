import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, X, File, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export default function DocumentUploadPanel({ jobIds, clientEmail, clientToken }) {
  const fileRef = useRef();
  const qc = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState(jobIds[0] || '');
  const [dragActive, setDragActive] = useState(false);

  // Fetch uploaded documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', selectedJobId],
    queryFn: () => base44.functions.invoke('getClientDocuments', {
      job_id: selectedJobId,
      client_email: clientEmail,
      token: clientToken,
    }),
    enabled: !!selectedJobId && !!clientToken,
    select: (res) => res.data?.documents || [],
    retry: 1,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Upload file
      const uploadRes = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      return base44.functions.invoke('createClientDocument', {
        job_id: selectedJobId,
        client_email: clientEmail,
        file_url: uploadRes.file_url,
        file_name: file.name,
        file_size: file.size,
        token: clientToken,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['client-documents', selectedJobId]);
    },
  });

  const handleFiles = async (files) => {
    if (!selectedJobId) return;

    for (const file of Array.from(files)) {
      // Validate
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_TYPES.includes(ext)) {
        alert(`File type not allowed: ${ext}`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        alert(`File too large: ${file.name}`);
        continue;
      }

      uploadMutation.mutate(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  return (
    <div className="space-y-3">
      {/* Job selector */}
      {jobIds.length > 1 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Select Job</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {jobIds.map((id) => (
              <option key={id} value={id}>
                Job #{id?.slice(-6)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition',
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-primary/5'
        )}
      >
        <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOC, JPG (max 25MB)
        </p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Uploading */}
      {uploadMutation.isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <Loader2 size={16} className="text-blue-600 animate-spin" />
          <p className="text-sm text-blue-700">Uploading document…</p>
        </div>
      )}

      {/* Upload success */}
      {uploadMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-600" />
          <p className="text-sm text-green-700">Document uploaded successfully</p>
        </div>
      )}

      {/* Documents list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Uploaded Documents</p>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between bg-card border border-border rounded-lg p-3 hover:bg-muted/30 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <File size={16} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              {doc.status === 'received' && (
                <Badge className="bg-green-100 text-green-700 text-xs">Received</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}