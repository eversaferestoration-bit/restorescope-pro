import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { CATEGORIES } from './ScoreEngine';

function CategoryRow({ cat, data }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((data.score / data.max) * 100);

  return (
    <div className="border-b last:border-0" style={{ borderColor: '#1e2d45' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition text-left">
        <span className="text-base shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-white">{cat.label}</span>
            <span className="text-xs font-bold" style={{ color: cat.color }}>
              {data.score}/{data.max} pts
            </span>
          </div>
          {/* Mini bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: cat.color }} />
          </div>
        </div>
        <span className="text-xs font-bold ml-2 shrink-0" style={{ color: cat.color }}>{pct}%</span>
        <div className="shrink-0 text-slate-500">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4">
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#1e2d45' }}>
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
                {item.pass
                  ? <CheckCircle size={14} style={{ color: '#10b981' }} />
                  : <XCircle size={14} style={{ color: '#ef4444' }} />}
                <span className="text-xs flex-1" style={{ color: item.pass ? '#c8d9eb' : '#7ba3c8' }}>{item.label}</span>
                <span className="text-xs font-bold shrink-0" style={{ color: item.pass ? '#10b981' : '#3a5a7c' }}>
                  {item.pass ? `+${item.points}` : `0/${item.points}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoryBreakdown({ checks }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <h2 className="text-sm font-semibold text-white">Score Breakdown</h2>
      </div>
      <div>
        {CATEGORIES.map(cat => (
          <CategoryRow key={cat.key} cat={cat} data={checks[cat.key]} />
        ))}
      </div>
    </div>
  );
}