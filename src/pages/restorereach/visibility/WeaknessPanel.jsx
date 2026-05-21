import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CATEGORIES } from './ScoreEngine';

const RECOMMENDATIONS = {
  gbp: {
    label: 'GBP Completeness',
    items: [
      { text: 'Add your Google Business Profile URL in Settings', action: '/restorereach/settings' },
      { text: 'Configure your Google Review link to collect more reviews', action: '/restorereach/settings' },
      { text: 'Complete your business address and phone number', action: '/restorereach/settings' },
    ],
  },
  reviews: {
    label: 'Reviews',
    items: [
      { text: 'Use Review Automation to send review requests after each job', action: '/restorereach/reviews' },
      { text: 'Share your review link with past customers via SMS or email', action: '/restorereach/reviews' },
      { text: 'Set up automated 2-day and 5-day follow-up reminders', action: '/restorereach/reviews' },
    ],
  },
  posting: {
    label: 'Posting Activity',
    items: [
      { text: 'Generate and schedule GBP posts using the AI Content Engine', action: '/restorereach/content' },
      { text: 'Aim for 2-4 GBP posts per week for maximum visibility', action: '/restorereach/gbp' },
      { text: 'Create a Storm Mode campaign to stay ahead of seasonal demand', action: '/restorereach/storm' },
    ],
  },
  content: {
    label: 'Local Content',
    items: [
      { text: 'Add more service areas and generate city-specific SEO pages', action: '/restorereach/areas' },
      { text: 'Connect your Facebook and Instagram pages in Settings', action: '/restorereach/settings' },
      { text: 'Target 5+ cities with active SEO pages for strong local rankings', action: '/restorereach/areas' },
    ],
  },
  citations: {
    label: 'Citations',
    items: [
      { text: 'Add your website URL in company settings for citation consistency', action: '/restorereach/settings' },
      { text: 'Link your Facebook business page in Settings', action: '/restorereach/settings' },
      { text: 'Add LinkedIn and Instagram URLs to strengthen your citation profile', action: '/restorereach/settings' },
    ],
  },
  photos: {
    label: 'Photos',
    items: [
      { text: 'Upload your company logo in Settings', action: '/restorereach/settings' },
      { text: 'Capture before/after photos on every job using Lead Capture', action: '/restorereach/leads' },
      { text: 'Photos increase GBP engagement by up to 42%', action: '/restorereach/gbp' },
    ],
  },
};

export default function WeaknessPanel({ checks }) {
  const weakCategories = CATEGORIES.filter(cat => {
    const d = checks[cat.key];
    return d && d.score < d.max;
  }).sort((a, b) => {
    const aGap = checks[a.key].max - checks[a.key].score;
    const bGap = checks[b.key].max - checks[b.key].score;
    return bGap - aGap;
  });

  if (!weakCategories.length) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <span className="text-4xl">🏆</span>
        <p className="text-white font-bold mt-2">Perfect Score!</p>
        <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>All visibility checks passed</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
        <h2 className="text-sm font-semibold text-white">Weaknesses & Recommendations</h2>
      </div>
      <div className="divide-y" style={{ divideColor: '#1e2d45' }}>
        {weakCategories.slice(0, 4).map(cat => {
          const data = checks[cat.key];
          const gap = data.max - data.score;
          const recs = RECOMMENDATIONS[cat.key];
          const failedItems = data.items.filter(i => !i.pass);

          return (
            <div key={cat.key} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm font-bold text-white">{cat.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: cat.color + '20', color: cat.color }}>
                  -{gap} pts missing
                </span>
              </div>

              {/* What's failing */}
              <div className="space-y-1 mb-3">
                {failedItems.map((item, i) => (
                  <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#7ba3c8' }}>
                    <span style={{ color: '#ef4444' }} className="shrink-0 mt-0.5">✕</span> {item.label}
                  </p>
                ))}
              </div>

              {/* Recommendations */}
              <div className="space-y-1.5">
                {recs?.items.slice(0, failedItems.length).map((rec, i) => (
                  <a key={i} href={rec.action}
                    className="flex items-start gap-2 text-xs py-2 px-3 rounded-lg hover:bg-white/5 transition group"
                    style={{ background: '#0a1020', color: '#c8d9eb' }}>
                    <ArrowRight size={11} className="shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform"
                      style={{ color: cat.color }} />
                    {rec.text}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}