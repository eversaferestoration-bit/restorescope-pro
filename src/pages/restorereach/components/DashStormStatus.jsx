import { Link } from 'react-router-dom';
import { CloudLightning, Radio, Eye, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function DashStormStatus({ status, recentStorm }) {
  if (status === 'inactive') {
    return (
      <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1e2d45' }}>
          <ShieldCheck size={17} style={{ color: '#3a5a7c' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Storm Mode — <span style={{ color: '#3a5a7c' }}>Inactive</span></p>
          <p className="text-xs mt-0.5" style={{ color: '#3a5a7c' }}>No active storm campaigns. Ready to deploy when needed.</p>
        </div>
        <Link to="/restorereach/storm"
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-90 font-medium"
          style={{ background: '#1e2d45', color: '#7ba3c8' }}>
          Prepare Storm Pack
        </Link>
      </div>
    );
  }

  if (status === 'monitoring') {
    return (
      <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: '#0f1a12', borderColor: '#1a3a22' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#10b98122' }}>
          <Eye size={17} style={{ color: '#10b981' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Storm Mode — <span className="text-green-400">Monitoring</span></p>
          <p className="text-xs mt-0.5" style={{ color: '#10b981' }}>Storm campaigns exist and are ready to activate quickly.</p>
        </div>
        <Link to="/restorereach/storm"
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-90 font-semibold text-white"
          style={{ background: '#10b981' }}>
          View Campaigns
        </Link>
      </div>
    );
  }

  // Active
  const activeSince = recentStorm?.created_date || recentStorm?.created_at;
  return (
    <div className="rounded-xl border p-4 flex items-center gap-4" style={{ background: '#1a0a00', borderColor: '#e05a1c44' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-orange-500">
        <CloudLightning size={17} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-white">Storm Mode</p>
          <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
            <Radio size={9} className="animate-pulse" /> ACTIVE
          </span>
        </div>
        <p className="text-xs" style={{ color: '#f59e0b' }}>
          {recentStorm?.campaign_name || 'Storm campaign active'}
          {activeSince && ` · Since ${format(new Date(activeSince), 'MMM d, h:mma')}`}
        </p>
      </div>
      <Link to="/restorereach/storm"
        className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition hover:opacity-90 font-semibold text-white"
        style={{ background: '#e05a1c' }}>
        Manage
      </Link>
    </div>
  );
}