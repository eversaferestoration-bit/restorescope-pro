import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2 } from 'lucide-react';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';

import GBPProfileSettings from './gbp/GBPProfileSettings';
import GBPHealthChecklist from './gbp/GBPHealthChecklist';
import GBPPostGenerator from './gbp/GBPPostGenerator';
import GBPPostCalendar from './gbp/GBPPostCalendar';
import GBPSuspensionScanner from './gbp/GBPSuspensionScanner';

export default function RRGBPCommand() {
  const { user, profile, companyId, profileLoading, isReady } = useRRCompany();

  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas', companyId],
    queryFn: () => base44.entities.RRServiceArea.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  const { data: gbpPosts = [] } = useQuery({
    queryKey: ['gbp-posts', companyId],
    queryFn: () => base44.entities.GBPPost.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
    <div className="p-4 md:p-7 max-w-6xl mx-auto space-y-5 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 size={22} style={{ color: '#e05a1c' }} /> GBP Command Center
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
          Manage your Google Business Profile, generate posts, and monitor suspension risk
        </p>
      </div>

      {/* 2-col: Profile Settings + Health Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GBPProfileSettings profile={profile} user={user} />
        <GBPHealthChecklist profile={profile} gbpPosts={gbpPosts.length} areas={areas} />
      </div>

      {/* AI Post Generator */}
      <GBPPostGenerator profile={profile} companyId={companyId} />

      {/* Post Calendar */}
      <GBPPostCalendar companyId={companyId} />

      {/* Suspension Risk Scanner */}
      <GBPSuspensionScanner profile={profile} gbpPosts={gbpPosts.length} areas={areas} />
    </div>
    </RRAccessGate>
  );
}