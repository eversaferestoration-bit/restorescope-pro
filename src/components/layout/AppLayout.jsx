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
import { base44 } from '@/api/base44Client';

export default function AppLayout() {
  // Enable session timeout, role integrity checks, and auto-logout
  useSecurity();

  const { user, userProfile } = useAuth();
  const identifiedRef = useRef(false);
  const backfilledRef = useRef(false);

  useEffect(() => {
    if (user && !identifiedRef.current) {
      identifiedRef.current = true;
      identifyUser(user, userProfile);
      Analytics.userLogin({ role: user.role, company_id: userProfile?.company_id });
    }
  }, [user, userProfile]);

  // Backfill company_id onto User record for existing users — required for RLS {{user_company_id}}
  useEffect(() => {
    if (!user || backfilledRef.current) return;
    if (user.company_id) return; // Already set, nothing to do
    backfilledRef.current = true;

    if (userProfile?.company_id) {
      // Fast path: stamp directly from in-memory profile
      base44.auth.updateMe({ company_id: userProfile.company_id }).catch((e) => {
        console.warn('[AppLayout] Failed to backfill company_id:', e?.message);
      });
    } else {
      // Slow path: backend function resolves via Company.created_by lookup
      base44.functions.invoke('backfillUserCompanyId', {}).catch((e) => {
        console.warn('[AppLayout] backfillUserCompanyId failed:', e?.message);
      });
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