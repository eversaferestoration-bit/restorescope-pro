import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2 } from 'lucide-react';

import GBPProfileSettings from './gbp/GBPProfileSettings';
import GBPHealthChecklist from './gbp/GBPHealthChecklist';
import GBPPostGenerator from './gbp/GBPPostGenerator';
import GBPPostCalendar from './gbp/GBPPostCalendar';
import GBPSuspensionScanner from './gbp/GBPSuspensionScanner';

export default function RRGBPCommand() {
  const { user } = useAuth();

  const { data: profileArr = [] } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const profile = profileArr[0];
  const companyId = profile?.id || user?.email || 'default';

  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list(),
  });

  const { data: gbpPosts = [] } = useQuery({
    queryKey: ['gbp-posts'],
    queryFn: () => base44.entities.GBPPost.list('-created_date', 100),
  });

  return (
    <div className="p-5 md:p-7 max-w-6xl mx-auto space-y-8">
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
  );
}