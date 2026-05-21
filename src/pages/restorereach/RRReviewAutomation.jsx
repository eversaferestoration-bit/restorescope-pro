import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';

import ReviewRequestForm from './reviews/ReviewRequestForm';
import ReviewTrackingTable from './reviews/ReviewTrackingTable';
import FollowUpAutomation from './reviews/FollowUpAutomation';
import AIReviewResponder from './reviews/AIReviewResponder';

export default function RRReviewAutomation() {
  const { user, companyId, profileLoading, isReady } = useRRCompany();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['review-requests', companyId],
    queryFn: () => base44.entities.ReviewRequest.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  // Stats
  const total = requests.length;
  const reviewed = requests.filter(r => r.status === 'reviewed').length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const sent = requests.filter(r => r.status === 'sent').length;
  const rate = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-5 md:p-7 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star size={22} style={{ color: '#e05a1c' }} /> Review Automation
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Generate review requests, track responses, and automate follow-ups
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Requests', value: total, color: '#7ba3c8' },
          { label: 'Reviews Received', value: reviewed, color: '#10b981' },
          { label: 'Sent / Awaiting', value: sent, color: '#3b82f6' },
          { label: 'Conversion Rate', value: `${rate}%`, color: '#e05a1c' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form + Follow-up side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ReviewRequestForm companyId={companyId} userEmail={user?.email} />
        <FollowUpAutomation requests={requests} />
      </div>

      {/* Tracking Table */}
      <ReviewTrackingTable requests={requests} isLoading={isLoading} />

      {/* AI Response Generator */}
      <AIReviewResponder />
    </div>
    </RRAccessGate>
  );
}