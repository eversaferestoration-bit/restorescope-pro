import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

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
  const { user } = useAuth();

  const companyId = user?.company_id;

  const tabFromUrl = new URLSearchParams(location.search).get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('tab', activeTab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [activeTab]);

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', jobId, companyId],
    enabled: !!jobId && !!companyId,
    retry: false,
    queryFn: async () => {
      const results = await base44.entities.Job.filter({
        id: jobId,
        company_id: companyId,
        is_deleted: false,
      });

      if (!results || results.length === 0) return null;

      const found = results[0];

      // cache safe version
      sessionStorage.setItem(`job_cache_${jobId}`, JSON.stringify(found));

      return found;
    },
  });

  const cachedJob = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(`job_cache_${jobId}`));
    } catch {
      return null;
    }
  })();

  const finalJob = job || cachedJob;

  if (isLoading && !cachedJob) {
    return <div className="p-6">Loading job...</div>;
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

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-4 border-b">
        <button onClick={() => navigate('/jobs')} className="text-sm mb-2">
          <ArrowLeft size={14} /> Jobs
        </button>

        <h1 className="text-xl font-bold">
          {finalJob.job_number || `Job #${finalJob.id}`}
        </h1>

        {finalJob.status && (
          <span className={STATUS_COLORS[finalJob.status]}>
            {finalJob.status}
          </span>
        )}
      </div>

      <div className="flex border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-2',
              activeTab === tab.key ? 'text-primary border-b-2 border-primary' : ''
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {ActiveComponent && <ActiveComponent job={finalJob} />}
      </div>
    </div>
  );
}