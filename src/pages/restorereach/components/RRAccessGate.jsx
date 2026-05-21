/**
 * RRAccessGate — wraps any RR page/section and shows:
 *   - A spinner while the profile is loading
 *   - A "permission denied" panel if no authenticated user
 *   - Children once company context is ready
 */
import { ShieldOff, Loader2 } from 'lucide-react';

export default function RRAccessGate({ isReady, profileLoading, children }) {
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" style={{ color: '#e05a1c' }} />
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="rounded-xl border py-16 text-center mx-auto max-w-md"
        style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <ShieldOff size={32} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
        <p className="text-white font-semibold text-sm">Access Restricted</p>
        <p className="text-xs mt-1 mb-4" style={{ color: '#7ba3c8' }}>
          You must be signed in to access this section.
        </p>
      </div>
    );
  }

  return children;
}