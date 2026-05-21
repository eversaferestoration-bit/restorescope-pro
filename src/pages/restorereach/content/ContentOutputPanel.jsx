import { useState } from 'react';
import { Copy, CheckCircle, Save, Calendar, Megaphone, Zap, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!' });
  };
  return (
    <button onClick={handle} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition hover:text-white"
      style={{ background: '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
      {copied ? <CheckCircle size={11} /> : <Copy size={11} />} {copied ? 'Copied!' : label}
    </button>
  );
}

function Section({ label, content, accent }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent || '#3a5a7c' }}>{label}</span>
        <CopyBtn text={content} />
      </div>
      <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export default function ContentOutputPanel({ result, generating, onSave, onSchedule, onCreateCampaign, saving }) {
  if (generating) {
    return (
      <div className="rounded-xl border p-10 flex flex-col items-center justify-center text-center" style={{ background: '#0d1829', borderColor: '#1e2d45', minHeight: 400 }}>
        <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
        <p className="text-white font-semibold text-base">AI is writing your content…</p>
        <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>Crafting local SEO-optimized copy</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border p-10 flex flex-col items-center justify-center text-center" style={{ background: '#0d1829', borderColor: '#1e2d45', minHeight: 400 }}>
        <FileText size={36} className="mb-3" style={{ color: '#3a5a7c' }} />
        <p className="text-white font-semibold">Ready to generate content</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: '#7ba3c8' }}>
          Configure your inputs on the left and click Generate Content
        </p>
      </div>
    );
  }

  const allText = [result.title, result.body, result.cta_text, result.hashtags].filter(Boolean).join('\n\n');

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      {/* Header with actions */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2"
        style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <CheckCircle size={15} style={{ color: '#10b981' }} />
          <span className="text-sm font-semibold text-white">
            {result.inputs?.content_type || 'Content'} Generated
          </span>
          {result.inputs?.city && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>
              📍 {result.inputs.city}
            </span>
          )}
        </div>
        <CopyBtn text={allText} label="Copy All" />
      </div>

      <div className="p-5 space-y-4">
        {/* Title */}
        <Section label="Title / Headline" content={result.title} accent="#3b82f6" />

        {/* Body */}
        <div className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#e05a1c' }}>Content Body</span>
            <CopyBtn text={result.body} />
          </div>
          <div className="text-sm text-white leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {result.body}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CTA */}
          <Section label="Call-to-Action" content={result.cta_text} accent="#10b981" />

          {/* Meta description */}
          {result.meta_description && (
            <Section label="Meta Description" content={result.meta_description} accent="#8b5cf6" />
          )}
        </div>

        {/* Hashtags */}
        {result.hashtags && (
          <div className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Hashtags</span>
              <CopyBtn text={result.hashtags} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.hashtags.split(/\s+/).filter(h => h.startsWith('#')).map((h, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#3b82f620', color: '#3b82f6' }}>{h}</span>
              ))}
            </div>
          </div>
        )}

        {/* Image suggestion */}
        {result.image_suggestion && (
          <div className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#3a5a7c' }}>📸 Suggested Image</p>
            <p className="text-sm italic" style={{ color: '#7ba3c8' }}>{result.image_suggestion}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60 min-h-[40px]"
            style={{ background: '#1e2d45', border: '1px solid #3a5a7c', color: '#7ba3c8' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
            Save
          </button>

          <button onClick={onSchedule}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold hover:opacity-90 transition min-h-[40px]"
            style={{ background: '#1e2d45', border: '1px solid #3a5a7c', color: '#7ba3c8' }}>
            <Calendar size={13} /> Schedule
          </button>

          <button onClick={onCreateCampaign} disabled={saving}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-60 min-h-[40px]"
            style={{ background: '#e05a1c' }}>
            <Megaphone size={13} /> <span className="hidden sm:inline">Create </span>Campaign
          </button>

          <CopyBtn text={allText} label="Copy All" />
        </div>
      </div>
    </div>
  );
}