import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Tab pages
import JobOverview from '@/components/job/tabs/JobOverview';
import JobInsuredClaim from '@/components/job/tabs/JobInsuredClaim';
import JobProperty from '@/components/job/tabs/JobProperty';
import JobRooms from '@/components/job/tabs/JobRooms';
import JobPhotos from '@/components/job/tabs/JobPhotos';
import JobObservations from '@/components/job/tabs/JobObservations';
import JobReadings from '@/components/job/tabs/JobReadings';
import JobEquipment from '@/components/job/tabs/JobEquipment';
import JobScope from '@/components/job/tabs/JobScope';
import JobEstimates from '@/components/job/tabs/JobEstimates';
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
  { key: 'scope', label: 'Scope', component: JobScope },
  { key: 'estimates', label: 'Estimates', component: JobEstimates },
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
  const [activeTab, setActiveTab] = useState('overview');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => base44.entities.Job.filter({ id: jobId }),
    select: (data) => data[0],
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-10 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Job not found.</p>
      </div>
    );
  }

  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border bg-card/60">
        <button
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition"
        >
          <ArrowLeft size={15} /> Jobs
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold font-display">
                {job.job_number || `Job #${job.id?.slice(-6)}`}
              </h1>
              {job.emergency_flag && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertCircle size={12} /> Emergency
                </span>
              )}
              {job.status && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] || 'bg-muted text-muted-foreground'}`}>
                  {job.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[job.loss_type, job.service_type].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar — horizontal scroll on mobile */}
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

      {/* Tab content */}
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {ActiveComponent && <ActiveComponent job={job} />}
      </div>
    </div>
  );
}