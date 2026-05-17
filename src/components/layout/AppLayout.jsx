import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TopBar from './TopBar';
import DemoBanner from '@/components/demo/DemoBanner';
import BetaFeedbackButton from '@/components/beta/BetaFeedbackButton';
import { useSecurity } from '@/hooks/useSecurity';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function AppLayout() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState(null);

  // Enable session timeout, role integrity checks, and auto-logout
  useSecurity();

  useEffect(() => {
    if (!user) return;
    base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false })
      .then((profiles) => { if (profiles[0]?.company_id) setCompanyId(profiles[0].company_id); })
      .catch(() => {});
  }, [user?.id]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DemoBanner />
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>

      {/* Beta feedback button — visible to all authenticated users */}
      <BetaFeedbackButton companyId={companyId} />
    </div>
  );
}