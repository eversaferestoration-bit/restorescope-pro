import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TopBar from './TopBar';
import DemoBanner from '@/components/demo/DemoBanner';
import { useSecurity } from '@/hooks/useSecurity';
import BetaFeedbackButton from '@/components/beta/BetaFeedbackButton';
import { useAuth } from '@/lib/AuthContext';
import { identifyUser, Analytics } from '@/lib/analytics';

export default function AppLayout() {
  // Enable session timeout, role integrity checks, and auto-logout
  useSecurity();

  const { user, userProfile } = useAuth();
  const identifiedRef = useRef(false);

  useEffect(() => {
    if (user && !identifiedRef.current) {
      identifiedRef.current = true;
      identifyUser(user, userProfile);
      Analytics.userLogin({ role: user.role, company_id: userProfile?.company_id });
    }
  }, [user, userProfile]);

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

      {/* Beta feedback floating button */}
      <BetaFeedbackButton />
    </div>
  );
}