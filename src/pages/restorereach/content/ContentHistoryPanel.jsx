import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const TYPE_COLORS = {
  gbp_post: '#3b82f6',
  seo_content: '#10b981',
  social: '#6366f1',
  storm_alert: '#ef4444',
  review_request: '#f59e0b',
  email: '#8b5cf6',
};

const STATUS_STYLES = {
  draft: { color: '#7ba3c8', bg: '#1e2d45' },
  active: { color: '#10b981', bg: '#10b98120' },
  paused: { color: '#f59e0b', bg: '#f59e0b20' },
  completed: { color: '#3a5a7c', bg: '#1e2d45' },
};

export default function ContentHistoryPanel() {
  const [open, setOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list('-created_date', 20),
    enabled: open,
  });

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition"
        style={{ borderBottom: open ? '1px solid #1e2d45' : 'none' }}>
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: '#e05a1c' }} />
          <span className="text-sm font-semibold text-white">Content History</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
            saved campaigns
          </span>
        </div>
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>

      {open && (
        <div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: '#3a5a7c' }}>No saved campaigns yet — generate and save content above</p>
            </div>
          ) : (
            <div className="divide-y" style={{ divideColor: '#1e2d45' }}>
              {campaigns.map(c => {
                const typeColor = TYPE_COLORS[c.campaign_type] || '#7ba3c8';
                const status = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.campaign_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>
                        {[c.target_service, c.target_city].filter(Boolean).join(' · ')}
                        {c.created_date && ` · ${new Date(c.created_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: status.bg, color: status.color }}>
                        {c.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: typeColor + '20', color: typeColor }}>
                        {c.campaign_type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}