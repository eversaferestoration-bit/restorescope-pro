import { useState } from 'react';
import { Copy, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!' });
    }} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition"
      style={{ background: '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
      {copied ? <CheckCircle size={10} /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ContentBlock({ label, content, accent, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!content) return null;

  const isArray = Array.isArray(content);
  const displayText = isArray ? content.join('\n') : content;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>{label}</span>
        <div className="flex items-center gap-2">
          {open && <CopyBtn text={displayText} />}
          {open ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#1e2d45' }}>
          {isArray ? (
            <ul className="mt-3 space-y-1.5">
              {content.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#c8d9eb' }}>
                  <span style={{ color: accent }} className="shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#c8d9eb' }}>{content}</p>
          )}
        </div>
      )}
    </div>
  );
}

const SECTION_CONFIG = [
  { key: 'gbp_post', label: '📍 Emergency GBP Post', accent: '#3b82f6', defaultOpen: true },
  { key: 'facebook_post', label: '📘 Facebook Post', accent: '#6366f1' },
  { key: 'landing_page_outline', label: '🌐 Landing Page Outline', accent: '#10b981' },
  { key: 'ad_headline', label: '📣 Ad Headlines', accent: '#f59e0b' },
  { key: 'service_keywords', label: '🔍 Service Keywords', accent: '#8b5cf6' },
];

export default function StormGeneratedContent({ content }) {
  if (!content) return null;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <CheckCircle size={14} style={{ color: '#10b981' }} />
        <h2 className="text-sm font-semibold text-white">Auto-Generated Storm Content</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>Ready</span>
      </div>
      <div className="p-5 space-y-3">
        {SECTION_CONFIG.map(s => (
          <ContentBlock
            key={s.key}
            label={s.label}
            content={content[s.key]}
            accent={s.accent}
            defaultOpen={s.defaultOpen}
          />
        ))}
      </div>
    </div>
  );
}