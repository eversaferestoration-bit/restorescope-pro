import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, TrendingUp, AlertTriangle, Lock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import SupplementCard from '@/components/job/supplements/SupplementCard';

export default function JobSupplements({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const isTechnician = user?.role === 'technician';

  const { data: supplements = [], isLoading } = useQuery({
    queryKey: ['supplements', job.id],
    queryFn: () => base44.entities.Supplement.filter({ job_id: job.id, is_deleted: false }, '-created_at'),
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ['estimates', job.id],
    queryFn: () => base44.entities.EstimateDraft.filter({ job_id: job.id, is_deleted: false }, '-version_number'),
  });

  const hasApprovedEstimate = drafts.some(d => ['approved', 'locked'].includes(d.status));

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateSupplement', { job_id: job.id });
      const data = res.data;
      if (data.error) {
        setError(data.error);
      } else {
        qc.invalidateQueries(['supplements', job.id]);
        qc.invalidateQueries(['estimates', job.id]);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to generate supplement.';
      setError(msg);
    }
    setGenerating(false);
  };

  const handleViewDraft = (draftId) => {
    // Navigate to the estimates tab and scroll to the draft
    // This is handled via parent — for now just a no-op, the draft will show in Estimates tab
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold font-display">Supplement Engine</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare job evidence against the approved estimate and detect missing scope, underpriced items, and new damage.
          </p>
        </div>
        {!isTechnician && (
          <button
            onClick={handleGenerate}
            disabled={generating || !hasApprovedEstimate}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 shrink-0"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            {generating ? 'Analyzing…' : 'Run Supplement Analysis'}
          </button>
        )}
      </div>

      {/* No approved estimate warning */}
      {!hasApprovedEstimate && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <p>An approved or locked estimate is required before running supplement analysis. Go to the <span className="font-semibold">Estimates</span> tab to approve one.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="bg-card rounded-xl border border-primary/30 p-6 text-center space-y-2">
          <Loader2 size={24} className="animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">Analyzing job evidence against approved estimate…</p>
          <p className="text-xs text-muted-foreground">This may take 15–30 seconds. The AI is comparing scope, pricing, and damage documentation.</p>
        </div>
      )}

      {/* Info note */}
      {!generating && hasApprovedEstimate && supplements.length === 0 && (
        <div className="flex items-start gap-2 bg-accent/30 border border-accent rounded-lg px-4 py-3 text-xs text-accent-foreground">
          <Info size={13} className="shrink-0 mt-0.5" />
          <p>No supplements yet. Click <span className="font-semibold">Run Supplement Analysis</span> to compare current job data against the approved estimate and identify gaps.</p>
        </div>
      )}

      {/* Supplement list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {supplements.map(s => (
            <SupplementCard key={s.id} supplement={s} onViewDraft={handleViewDraft} />
          ))}
        </div>
      )}

      {/* Note about generated drafts */}
      {supplements.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Supplement estimates are created as new draft versions in the <span className="font-semibold">Estimates</span> tab and do not overwrite the original.
        </p>
      )}
    </div>
  );
}