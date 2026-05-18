import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useCompany } from '@/lib/CompanyContext';

/**
 * Dev-only debug panel showing tenant data chain.
 * Only renders when VITE_DEBUG=true or localhost.
 */
export default function TenantDebugPanel({ job, rooms }) {
  const { user, userProfile } = useAuth();
  const { activeCompany, companyId } = useCompany();
  const [open, setOpen] = useState(false);

  // Only show on localhost or when debug flag is set
  const isDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    import.meta.env?.VITE_DEBUG === 'true';

  if (!isDev) return null;

  const rows = [
    ['user.id', user?.id],
    ['user.email', user?.email],
    ['user.company_id', user?.company_id],
    ['userProfile.company_id', userProfile?.company_id],
    ['activeCompany.id', activeCompany?.id],
    ['activeCompany.name', activeCompany?.name],
    ['companyId (canonical)', companyId],
    ...(job ? [
      ['job.id', job?.id],
      ['job.job_number', job?.job_number],
      ['job.company_id', job?.company_id],
    ] : []),
    ...(rooms !== undefined ? [['rooms count', rooms?.length ?? '—']] : []),
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="bg-slate-900 text-green-400 border border-green-600/40 px-2 py-1 rounded-md text-xs"
      >
        🔍 Debug {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-1 bg-slate-950/95 border border-green-600/30 rounded-lg p-3 max-w-xs shadow-2xl">
          <p className="text-green-400 font-semibold mb-2">Tenant Chain</p>
          <div className="space-y-0.5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-slate-400 shrink-0">{label}:</span>
                <span className={value ? 'text-green-300' : 'text-red-400'}>{value || '(missing)'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}