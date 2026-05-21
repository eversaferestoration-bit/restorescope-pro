import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Star, Zap, Copy, CheckCircle, MessageSquare, Send } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const TEMPLATES = [
  { label: 'Post-Job SMS', type: 'sms' },
  { label: 'Follow-up Email', type: 'email' },
  { label: 'Thank You Card', type: 'card' },
  { label: 'Insurance Agent Referral', type: 'referral' },
];

export default function RRReviewAutomation() {
  const { user } = useAuth();
  const [templateType, setTemplateType] = useState('sms');
  const [customerName, setCustomerName] = useState('');
  const [service, setService] = useState('water damage restoration');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const companyProfile = profile?.[0];
  const reviewLink = companyProfile?.google_review_link || 'YOUR_GOOGLE_REVIEW_LINK';

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const name = companyProfile?.company_name || 'our company';
      const prompts = {
        sms: `Write a warm, friendly SMS review request for a restoration company.
Company: ${name} | Customer: ${customerName || '[Customer Name]'} | Service: ${service}
Google Review Link: ${reviewLink}
Keep it under 160 characters if possible. Friendly, genuine, not pushy. Include the review link.`,

        email: `Write a professional follow-up email requesting a Google review.
Company: ${name} | Customer: ${customerName || '[Customer Name]'} | Service completed: ${service}
Review Link: ${reviewLink}
Subject line + body. Personal, warm, briefly mention the job, ask for review, provide link. 100-150 words.`,

        card: `Write a handwritten-style thank you card message from a restoration company.
Company: ${name} | Customer: ${customerName || '[Customer Name]'} | Service: ${service}
Include a polite mention that a review helps their small business. Max 80 words. Heartfelt and genuine.`,

        referral: `Write a referral request message to an insurance agent from a restoration company.
Company: ${name} | Service: ${service}
Ask them to refer homeowners who need restoration services. Professional. Include value proposition.
Keep it under 150 words. Mention they can review their services too: ${reviewLink}`,
      };

      const generated = await base44.integrations.Core.InvokeLLM({ prompt: prompts[templateType] });
      setResult(generated);
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!' });
  };

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star size={22} style={{ color: '#e05a1c' }} /> Review Automation
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Generate review request templates and automate your reputation</p>
      </div>

      {/* Review link setup notice */}
      {!companyProfile?.google_review_link && (
        <div className="rounded-xl border border-yellow-500/30 p-4 mb-6 flex items-start gap-3" style={{ background: '#1a1200' }}>
          <Star size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Add your Google Review link</p>
            <p className="text-xs text-yellow-300/70 mt-0.5">Go to Settings → Company Profile to add your Google review shortlink for better templates</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <h2 className="text-sm font-semibold text-white">Template Generator</h2>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">Template Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.type} onClick={() => setTemplateType(t.type)}
                  className={`py-2 rounded-lg text-xs font-medium transition border ${templateType === t.type ? 'text-white border-orange-500' : 'text-slate-400 border-slate-700 hover:border-slate-500'}`}
                  style={templateType === t.type ? { background: '#e05a1c22' } : { background: '#0a1020' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Customer Name (optional)</label>
            <input className={inp} style={inpStyle} placeholder="Jane Smith" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Service Completed</label>
            <input className={inp} style={inpStyle} placeholder="water damage restoration" value={service} onChange={e => setService(e.target.value)} />
          </div>

          <button onClick={generate} disabled={generating}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            <Zap size={15} /> {generating ? 'Generating…' : 'Generate Template'}
          </button>
        </div>

        {/* Output */}
        <div className="rounded-xl border p-5 flex flex-col" style={{ background: '#0d1829', borderColor: '#1e2d45', minHeight: 360 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare size={14} style={{ color: '#7ba3c8' }} />
              {TEMPLATES.find(t => t.type === templateType)?.label}
            </h2>
            {result && (
              <button onClick={copy}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition font-medium"
                style={{ background: copied ? '#10b98133' : '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {generating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : result ? (
            <div className="flex-1 rounded-lg p-3" style={{ background: '#0a1020' }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8d9eb' }}>{result}</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Star size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
                <p className="text-sm" style={{ color: '#3a5a7c' }}>Your review template will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <h2 className="text-sm font-semibold text-white mb-3">📋 Review Request Best Practices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { tip: 'Send within 24-48 hours', desc: 'Strike while satisfaction is highest' },
            { tip: 'Personalize with their name', desc: 'Increases response rate by 2-3x' },
            { tip: 'One clear CTA', desc: 'Direct link, no friction' },
            { tip: 'Follow up once', desc: '3-5 days after first request' },
            { tip: 'Train your technicians', desc: 'Verbal ask at job completion' },
            { tip: 'Respond to all reviews', desc: 'Shows you care, boosts GBP ranking' },
          ].map(({ tip, desc }) => (
            <div key={tip} className="rounded-lg p-3" style={{ background: '#0a1020' }}>
              <p className="text-xs font-semibold text-white">✓ {tip}</p>
              <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}