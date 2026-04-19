import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FilePlus, Loader2, AlertTriangle, Lock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import EstimateDraftCard from '@/components/job/estimates/EstimateDraftCard';

export default function JobEstimates({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [profileId, setProfileId] = useState('');
  const isTechnician = user?.role === 'technician';

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['estimates', job.id],
    queryFn: () => base44.entities.EstimateDraft.filter({ job_id: job.id, is_deleted: false }, '-version_number'),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['pricing-profiles', job.company_id],
    queryFn: () => base44.entities.PricingProfile.filter({ company_id: job.company_id, is_deleted: false }),
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const res = await base44.functions.invoke('generateEstimateDraft', {
      job_id: job.id,
      pricing_profile_id: profileId || undefined,
    });
    const data = res.data;
    if (data.error) {
      setError(data);
    } else {
      qc.invalidateQueries(['estimates', job.id]);
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      {/* Generate bar */}
      {!isTechnician && (
        <div className="flex items-center gap-2 flex-wrap">
          {profiles.length > 0 && (
            <div className="relative">
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                <option value="">Default pricing profile</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
            {generating ? 'Generating…' : 'Generate Estimate'}
          </button>
        </div>
      )}

      {/* Error states */}
      {error && (
        <div className={cn('flex items-start gap-2 rounded-lg px-4 py-3 text-sm border', error.error === 'subscription_required' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-destructive/10 border-destructive/30 text-destructive')}>
          {error.error === 'subscription_required' ? <Lock size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
          <p>{error.message || error.error}</p>
        </div>
      )}

      {/* Draft list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : drafts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <FilePlus size={28} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-semibold font-display">No estimates yet</p>
          <p className="text-xs text-muted-foreground mt-1">Confirm scope items first, then generate an estimate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <EstimateDraftCard key={draft.id} draft={draft} jobId={job.id} readOnly={isTechnician} />
          ))}
        </div>
      )}
    </div>
  );
}