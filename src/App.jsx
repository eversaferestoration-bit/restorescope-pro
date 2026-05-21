import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CompanyProvider } from '@/lib/CompanyContext';
import { DemoProvider } from '@/lib/DemoContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/lib/ProtectedRoute';

import AppLayout from '@/components/layout/AppLayout';
import PageTransition from '@/components/PageTransition';

import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';

import ClientLogin from '@/pages/client/ClientLogin';
import ClientPortal from '@/pages/client/ClientPortal';

import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Jobs from '@/pages/Jobs';
import NewJob from '@/pages/NewJob';
import JobDetail from '@/pages/JobDetail';
import Settings from '@/pages/Settings';
import Billing from '@/pages/Billing';
import Users from '@/pages/Users';
import Templates from '@/pages/Templates';
import PricingProfiles from '@/pages/PricingProfiles';
import AuditLog from '@/pages/AuditLog';
import Analytics from '@/pages/Analytics';
import EnterpriseSettings from '@/pages/EnterpriseSettings';
import TeamPerformance from '@/pages/TeamPerformance';
import DominanceValidation from '@/pages/DominanceValidation';
import DemoJob from '@/pages/DemoJob';
import BetaAdmin from '@/pages/BetaAdmin';
import BetaManagement from '@/pages/BetaManagement';
import BetaUsers from '@/pages/BetaUsers';
import BetaFeedbackAdmin from '@/pages/BetaFeedbackAdmin';

import RRLayout from '@/pages/restorereach/RRLayout';
import RRDashboard from '@/pages/restorereach/RRDashboard';
import RRGBPCommand from '@/pages/restorereach/RRGBPCommand';
import RRAIContent from '@/pages/restorereach/RRAIContent';
import RRReviewAutomation from '@/pages/restorereach/RRReviewAutomation';
import RRStormMode from '@/pages/restorereach/RRStormMode';
import RRLeadCapture from '@/pages/restorereach/RRLeadCapture';
import RRServiceAreas from '@/pages/restorereach/RRServiceAreas';
import RRVisibilityScore from '@/pages/restorereach/RRVisibilityScore';
import RRSettings from '@/pages/restorereach/RRSettings';
import RRAIDamageScan from '@/pages/restorereach/RRAIDamageScan';
import RRCompetitorTracker from '@/pages/restorereach/RRCompetitorTracker';
import RRCitationManager from '@/pages/restorereach/RRCitationManager';

function FullScreenLoader({ message = 'Loading RestoreScope Pro...' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  const { isLoadingAuth, isAuthenticated, authError, needsOnboarding } = useAuth();

  if (isLoadingAuth) {
    return <FullScreenLoader message="Verifying session..." />;
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={needsOnboarding ? '/onboarding' : '/dashboard'} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to={needsOnboarding ? '/onboarding' : '/dashboard'} replace />
          ) : (
            <Signup />
          )
        }
      />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/client-login" element={<ClientLogin />} />
      <Route path="/client-portal" element={<ClientPortal />} />
      
      <Route
        path="/onboarding"
        element={
          isAuthenticated ? (
            <PageTransition>
              <Onboarding />
            </PageTransition>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          }
        />

        <Route
          path="/jobs"
          element={
            <PageTransition>
              <Jobs />
            </PageTransition>
          }
        />

        <Route
          path="/jobs/new"
          element={
            <PageTransition>
              <NewJob />
            </PageTransition>
          }
        />

        <Route
          path="/jobs/:jobId"
          element={
            <PageTransition>
              <JobDetail />
            </PageTransition>
          }
        />

        <Route
          path="/settings"
          element={
            <PageTransition>
              <Settings />
            </PageTransition>
          }
        />

        <Route
          path="/billing"
          element={
            <PageTransition>
              <Billing />
            </PageTransition>
          }
        />

        <Route
          path="/users"
          element={
            <PageTransition>
              <Users />
            </PageTransition>
          }
        />

        <Route
          path="/templates"
          element={
            <PageTransition>
              <Templates />
            </PageTransition>
          }
        />

        <Route
          path="/pricing-profiles"
          element={
            <PageTransition>
              <PricingProfiles />
            </PageTransition>
          }
        />

        <Route
          path="/audit-log"
          element={
            <PageTransition>
              <AuditLog />
            </PageTransition>
          }
        />

        <Route
          path="/analytics"
          element={
            <PageTransition>
              <Analytics />
            </PageTransition>
          }
        />

        <Route
          path="/team-performance"
          element={
            <PageTransition>
              <TeamPerformance />
            </PageTransition>
          }
        />

        <Route
          path="/dominance-validation"
          element={
            <PageTransition>
              <DominanceValidation />
            </PageTransition>
          }
        />

        <Route
          path="/enterprise"
          element={
            <PageTransition>
              <EnterpriseSettings />
            </PageTransition>
          }
        />

        <Route
          path="/enterprise-settings"
          element={<Navigate to="/enterprise" replace />}
        />

        <Route
          path="/demo"
          element={
            <PageTransition>
              <DemoJob />
            </PageTransition>
          }
        />

        <Route
          path="/beta-admin"
          element={
            <PageTransition>
              <BetaAdmin />
            </PageTransition>
          }
        />

        <Route
          path="/beta-management"
          element={
            <PageTransition>
              <BetaManagement />
            </PageTransition>
          }
        />

        <Route
        path="/beta-users"
        element={
          <PageTransition>
            <BetaUsers />
          </PageTransition>
        }
        />

        <Route
        path="/beta-feedback"
        element={
          <PageTransition>
            <BetaFeedbackAdmin />
          </PageTransition>
        }
        />
      </Route>

      {/* RestoreReach AI Module */}
      <Route path="/restorereach" element={<RRLayout />}>
        <Route index element={<RRDashboard />} />
        <Route path="gbp" element={<RRGBPCommand />} />
        <Route path="content" element={<RRAIContent />} />
        <Route path="reviews" element={<RRReviewAutomation />} />
        <Route path="storm" element={<RRStormMode />} />
        <Route path="leads" element={<RRLeadCapture />} />
        <Route path="areas" element={<RRServiceAreas />} />
        <Route path="visibility" element={<RRVisibilityScore />} />
        <Route path="scan" element={<RRAIDamageScan />} />
        <Route path="competitors" element={<RRCompetitorTracker />} />
        <Route path="citations" element={<RRCitationManager />} />
        <Route path="settings" element={<RRSettings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
      <DemoProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedRoutes />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </DemoProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}