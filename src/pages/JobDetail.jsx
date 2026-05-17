import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

import JobOverview from '@/components/job/tabs/JobOverview';
import JobInsuredClaim from '@/components/job/tabs/JobInsuredClaim';
import JobProperty from '@/components/job/tabs/JobProperty';
import JobRooms from '@/components/job/tabs/JobRooms';
import JobPhotos from '@/components/job/tabs/JobPhotos';
import JobObservations from '@/components/job/tabs/JobObservations';
import JobReadings from '@/components/job/tabs/JobReadings';
import JobEquipment from '@/components/job/tabs/JobEquipment';
import JobContainment from '@/components/job/tabs/JobContainment';
import JobScope from '@/components/job/tabs/JobScope';
import JobEstimates from '@/components/job/tabs/JobEstimates';
import JobSupplements from '@/components/job/tabs/JobSupplements';
import JobJustification from '@/components/job/tabs/JobJustification';
import JobApprovals from '@/components/job/tabs/JobApprovals';
import JobExports from '@/components/job/tabs/JobExports';

const TABS = [
  { key: 'overview', label: 'Overview', component: JobOverview },
  { key: 'insured', label: 'Insured/Claim', component: JobInsuredClaim },
  { key: 'property', label: 'Property', component: JobProperty },
  { key: 'rooms', label: 'Rooms', component: JobRooms },
  { key: 'photos', label: 'Photos', component: JobPhotos },
  { key: 'observations', label: 'Observations', component: JobObservations },
  { key: 'readings', label: 'Readings', component: JobReadings },
  { key: 'equipment', label: 'Equipment', component: JobEquipment },
  { key: 'containment', label: 'Containment', component: JobContainment },
  { key: 'scope', label: 'Scope', component: JobScope },
  { key: 'estimates', label: 'Estimates', component: JobEstimates },
  { key: 'supplements', label: 'Supplements', component: JobSupplements },
  { key: 'justification', label: 'Justification', component: JobJustification },
  { key: 'approvals', label: 'Approvals', component: JobApprovals },
  { key: 'exports', label: 'Exports', component: JobExports },
];

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  pending_approval: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();

  const tabFromUrl = new URLSearchParams(location.search).get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('tab', activeTab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [activeTab]);

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', jobId],
    enabled: !!jobId,
    retry: 2,
    staleTime: 30 * 1000,
    queryFn: async () => {
      console.log('[JobDetail] Loading job, route param jobId:', jobId);

      let found = null;

      // Try direct id lookup first
      try {
        found = await base44.entities.Job.get(jobId);
        if (found?.is_deleted) found = null;
      } catch {
        found = null;
      }

      // Fallback: route param might be a job_number
      if (!found) {
        try {
          const results = await base44.entities.Job.filter({ job_number: jobId, is_deleted: false });
          found = results?.[0] || null;
        } catch {
          found = null;
        }
      }

      if (!found) {
        console.warn('[JobDetail] Job not found for param:', jobId);
        return null;
      }

      console.log('[JobDetail] Loaded job:', { id: found.id, job_number: found.job_number, company_id: found.company_id });

      // If route param was a job_number, redirect to the real id-based URL
      if (found.id && found.id !== jobId) {
        const tab = new URLSearchParams(location.search).get('tab') || 'overview';
        navigate(`/jobs/${found.id}?tab=${tab}`, { replace: true });
      }

      // Cache by the real job id
      sessionStorage.setItem(`job_cache_${found.id}`, JSON.stringify(found));

      return found;
    },
  });

  // Only use cache keyed by the real job id (avoid stale job_number-keyed caches)
  const cachedJob = (() => {
    try {
      // Try the current param first (may be real id)
      const direct = JSON.parse(sessionStorage.getItem(`job_cache_${jobId}`));
      if (direct?.id) return direct;
      return null;
    } catch {
      return null;
    }
  })();

  // finalJob must have a real DB id — never pass a stale or temporary object to tabs
  const finalJob = job?.id ? job : (cachedJob?.id ? cachedJob : null);

  // Resolve company_id for child tabs (from job, user profile, or user record)
  const companyId = finalJob?.company_id || userProfile?.company_id || user?.company_id || '';

  if (isLoading && !finalJob) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-10 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (isError || !finalJob) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Job not found or access denied.</p>
        <button
          onClick={() => navigate('/jobs')}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  // Enrich job with resolved company_id so all child tabs have it
  const jobForTabs = companyId && !finalJob.company_id ? { ...finalJob, company_id: companyId } : finalJob;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border bg-card/60">
        <button
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition"
        >
          <ArrowLeft size={15} /> Jobs
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold font-display">
            {finalJob.job_number || `Job #${String(finalJob.id || '').slice(-6)}`}
          </h1>
          {finalJob.emergency_flag && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertCircle size={12} /> Emergency
            </span>
          )}
          {finalJob.status && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[finalJob.status] || 'bg-muted text-muted-foreground'}`}>
              {String(finalJob.status).replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {[finalJob.loss_type, finalJob.service_type].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="border-b border-border bg-card/40 sticky top-0 z-10 overflow-x-auto">
        <div className="flex min-w-max px-4 md:px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {ActiveComponent && <ActiveComponent job={jobForTabs} />}
      </div>
    </div>
  );
}