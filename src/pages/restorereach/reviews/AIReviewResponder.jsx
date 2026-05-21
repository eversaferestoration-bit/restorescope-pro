import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Copy, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const RESPONSE_TYPES = [
  { key: 'short', label: 'Short', desc: '1-2 sentences', color: '#10b981' },
  { key: 'standard', label: 'Standard', desc: '3-4 sentences', color: '#3b82f6' },
  { key: 'personalized', label: 'Personalized', desc: 'Detailed & specific', color: '#8b5cf6' },
];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!' });
    }} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition"
      style={{ background: '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
      {copied ? <CheckCircle size={10} /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function AIReviewResponder() {
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [service, setService] = useState('');
  const [city, setCity] = useState('');
  const [generating, setGenerating] = useState(false);
  const [responses, setResponses] = useState(null);

  const generate = async () => {
    if (!reviewText.trim()) {
      toast({ title: 'Paste a review first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setResponses(null);
    try {
      const prompt = `You are a reputation management expert for a restoration company.

A customer left this Google review:
"${reviewText}"

Customer name: ${customerName || 'the customer'}
Service: ${service || 'restoration service'}
City: ${city || 'local area'}

Generate 3 owner response versions. Rules:
- Professional and grateful
- Mention the service and city naturally
- Never use: "trauma", "compassionate", "junk"
- Short: 1-2 sentences max
- Standard: 3-4 sentences
- Personalized: reference specific details from the review, 4-6 sentences

Return ONLY valid JSON:
{
  "short": "Short response text",
  "standard": "Standard response text",
  "personalized": "Personalized response text"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            short: { type: 'string' },
            standard: { type: 'string' },
            personalized: { type: 'string' },
          },
        },
      });
      setResponses(result);
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <Zap size={14} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">AI Review Response Generator</h2>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Paste the Google Review</label>
            <textarea className={inp + ' resize-none'} rows={5}
              placeholder="Paste the customer review here…"
              value={reviewText} onChange={e => setReviewText(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Customer</label>
              <input className={inp} placeholder="Jane S." value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Service</label>
              <input className={inp} placeholder="Water Damage" value={service} onChange={e => setService(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">City</label>
              <input className={inp} placeholder="Nashville" value={city} onChange={e => setCity(e.target.value)} />
            </div>
          </div>
          <button onClick={generate} disabled={generating}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            {generating
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
              : <><Zap size={13} /> Generate Responses</>}
          </button>
        </div>

        {/* Output */}
        <div className="space-y-3">
          {generating && (
            <div className="rounded-xl border p-8 flex flex-col items-center justify-center" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <div className="w-9 h-9 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-2" />
              <p className="text-sm text-white">Crafting responses…</p>
            </div>
          )}

          {responses && !generating && RESPONSE_TYPES.map(({ key, label, desc, color }) => (
            <div key={key} className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color }}>{label}</span>
                  <span className="text-xs" style={{ color: '#3a5a7c' }}>{desc}</span>
                </div>
                <CopyBtn text={responses[key]} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#c8d9eb' }}>{responses[key]}</p>
            </div>
          ))}

          {!responses && !generating && (
            <div className="rounded-xl border p-8 flex flex-col items-center justify-center text-center" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
              <Zap size={26} className="mb-2" style={{ color: '#3a5a7c' }} />
              <p className="text-sm" style={{ color: '#3a5a7c' }}>Paste a review and generate 3 response options</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}