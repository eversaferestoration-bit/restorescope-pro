import { Link } from 'react-router-dom';
import { Building2, Star, FileText, CloudLightning, Zap } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  gbp_post: { label: 'GBP Post', icon: Building2, color: '#3b82f6' },
  review_request: { label: 'Review Request', icon: Star, color: '#f59e0b' },
  seo_content: { label: 'SEO Content', icon: FileText, color: '#10b981' },
  storm_alert: { label: 'Storm Alert', icon: CloudLightning, color: '#e05a1c' },
  social: { label: 'Social Post', icon: Zap, color: '#8b5cf6' },
  email: { label: 'Email Campaign', icon: FileText, color: '#06b6d4' },
};

const STATUS_STYLES = {
  active: 'bg-green-500/20 text-green-400',
  draft: 'bg-slate-500/20 text-slate-400',
  paused: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-blue-500/20 text-blue-400',
};

export default function DashMarketingActivity({ campaigns, loading }) {
  const recent = campaigns.slice(0, 10);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Zap size={15} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">Marketing Activity</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{campaigns.length}</span>
        </div>
        <Link to="/restorereach/content" className="text-xs hover:text-orange-400 transition" style={{ color: '#7ba3c8' }}>
          Create content →
        </Link>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}
        </div>
      ) : recent.length === 0 ? (
        <div className="py-14 text-center">
          <Building2 size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
          <p className="text-sm text-white font-medium">No campaigns yet</p>
          <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Generate your first GBP post or SEO content</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Link to="/restorereach/gbp" className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#3b82f6' }}>
              GBP Post
            </Link>
            <Link to="/restorereach/content" className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#10b981' }}>
              SEO Content
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
          {recent.map((c) => {
            const cfg = TYPE_CONFIG[c.campaign_type] || TYPE_CONFIG.gbp_post;
            const Icon = cfg.icon;
            const dateStr = c.created_date || c.created_at;
            return (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors" style={{ borderColor: '#1e2d45' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.color + '22' }}>
                  <Icon size={14} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.campaign_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: '#7ba3c8' }}>{cfg.label}</span>
                    {c.target_city && <span className="text-xs" style={{ color: '#3a5a7c' }}>· {c.target_city}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[c.status] || STATUS_STYLES.draft}`}>
                    {c.status}
                  </span>
                  {dateStr && (
                    <span className="text-xs hidden sm:block" style={{ color: '#3a5a7c' }}>
                      {format(new Date(dateStr), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}