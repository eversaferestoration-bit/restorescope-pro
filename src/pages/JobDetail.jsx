import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import RiskIndicator from '@/components/job/RiskIndicator';
import RiskPanel from '@/components/job/RiskPanel';

// Tab pages
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
import JobJustification from '@/components/job/tabs/JobJustification';
import JobApprovals from '@/components/job/tabs/JobApprovals';
import JobExports from '@/components/job/tabs/JobExports';
import JobSupplements from '@/components/job/tabs/JobSupplements';
import OutcomePanel from '@/components/job/OutcomePanel';
import KnowledgePanel from '@/components/job/KnowledgePanel';

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
  { key: 'outcome', label: 'Outcome', component: null },
  { key: 'knowledge', label: 'Knowledge', component: null },
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
  const tabFromUrl = new URLSearchParams(location.search).get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [riskData, setRiskData] = useState(null);
  const [showRiskPanel, setShowRiskPanel] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => base44.entities.Job.filter({ id: jobId, is_deleted: false }),
    select: (data) => data[0],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Analyze risk on job load
  useEffect(() => {
    if (job?.id) {
      base44.functions.invoke('analyzeRisk', { job_id: job.id })
        .then((res) => {
          if (res.data && !res.data.error) {
            setRiskData(res.data);
          }
        })
        .catch(console.error);
    }
  }, [job?.id]);

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

  const ActiveTab = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = ActiveTab?.component;
  const isOutcomeTab = activeTab === 'outcome';
  const isKnowledgeTab = activeTab === 'knowledge';

  return (
    <div className="flex flex-col min-h-full scrollable-container">
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
              {riskData && (
                <RiskIndicator
                  riskLevel={riskData.risk_level}
                  flagCount={riskData.risk_flags?.length || 0}
                  onClick={() => setShowRiskPanel(true)}
                />
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
        {isOutcomeTab ? (
          <OutcomePanel jobId={job?.id} />
        ) : isKnowledgeTab ? (
          <KnowledgePanel jobId={job?.id} />
        ) : (
          ActiveComponent && <ActiveComponent job={job} />
        )}
      </div>

      {showRiskPanel && riskData && (
        <RiskPanel riskData={riskData} onClose={() => setShowRiskPanel(false)} />
      )}
    </div>
  );
}