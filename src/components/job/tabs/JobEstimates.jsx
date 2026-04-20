import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FilePlus, Loader2, AlertTriangle, Lock, ChevronDown, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import EstimateDraftCard from '@/components/job/estimates/EstimateDraftCard';
import JobDefense from '@/components/job/tabs/JobDefense';
import JobSupplements from '@/components/job/tabs/JobSupplements';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function JobEstimates({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [profileId, setProfileId] = useState('');
  const [activeTab, setActiveTab] = useState('estimates'); // 'estimates' | 'defense' | 'supplements'
  const [selectedDefenseEstimateId, setSelectedDefenseEstimateId] = useState(null);
  const isTechnician = user?.role === 'technician';

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['estimates', job.id],
    queryFn: () => base44.entities.EstimateDraft.filter({ job_id: job.id, is_deleted: false }, '-version_number'),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['pricing-profiles', job.company_id],
    queryFn: () => base44.entities.PricingProfile.filter({ company_id: job.company_id, is_deleted: false }),
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
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
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.message ? data : { message: data?.detail || data?.message || 'Failed to generate estimate. Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenDefense = (draftId) => {
    setSelectedDefenseEstimateId(draftId);
    setActiveTab('defense');
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('estimates')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
            activeTab === 'estimates' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Estimates
        </button>
        <button
          onClick={() => setActiveTab('defense')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
            activeTab === 'defense' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Shield size={13} /> Defense
        </button>
        <button
          onClick={() => setActiveTab('supplements')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
            activeTab === 'supplements' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText size={13} /> Supplements
        </button>
      </div>

      {/* Defense sub-tab */}
      {activeTab === 'defense' && (
        <div className="space-y-3">
          {drafts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Analyze estimate:</span>
              {drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDefenseEstimateId(d.id)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition',
                    selectedDefenseEstimateId === d.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-border'
                  )}
                >
                  {d.label || `v${d.version_number}`}
                </button>
              ))}
            </div>
          )}
          <JobDefense job={job} estimateId={selectedDefenseEstimateId || drafts[0]?.id} />
        </div>
      )}

      {/* Supplements sub-tab */}
      {activeTab === 'supplements' && <JobSupplements job={job} />}

      {/* Estimates sub-tab */}
      {activeTab === 'estimates' && (
        <div>
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
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex justify-between">
                <LoadingSkeleton className="h-5 w-32" />
                <LoadingSkeleton className="h-6 w-20" />
              </div>
              <div className="flex gap-2">
                <LoadingSkeleton className="h-4 w-16" />
                <LoadingSkeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <FilePlus size={22} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold font-display">No estimates yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Generate an AI-powered estimate from your rooms and scope items. Takes about 10 seconds.</p>
          </div>
          {!isTechnician && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
              {generating ? 'Generating…' : 'Generate Estimate'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div key={draft.id}>
              <EstimateDraftCard draft={draft} jobId={job.id} readOnly={isTechnician} />
              <button
                onClick={() => handleOpenDefense(draft.id)}
                className="mt-1.5 ml-1 inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <Shield size={11} /> Analyze defense
              </button>
            </div>
          ))}
        </div>
      )}
        </div>
      )}
    </div>
  );
}