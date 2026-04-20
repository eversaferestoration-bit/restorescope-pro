import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { DemoProvider } from '@/lib/DemoContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/lib/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

// Auth pages
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Client pages
import ClientLogin from '@/pages/client/ClientLogin';
import ClientPortal from '@/pages/client/ClientPortal';

// App pages
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required is handled by ProtectedRoute
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Client portal routes */}
      <Route path="/client-login" element={<ClientLogin />} />
      <Route path="/client-portal" element={<ClientPortal />} />

      {/* Onboarding — protected but outside app shell */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Protected app routes with shared layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/new" element={<NewJob />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/users" element={<Users />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/pricing-profiles" element={<PricingProfiles />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/team-performance" element={<TeamPerformance />} />
        <Route path="/dominance-validation" element={<DominanceValidation />} />
        <Route path="/enterprise" element={<EnterpriseSettings />} />
        <Route path="/demo" element={<DemoJob />} />
        <Route path="/beta-admin" element={<BetaAdmin />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <DemoProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </DemoProvider>
    </AuthProvider>
  );
}

export default App;