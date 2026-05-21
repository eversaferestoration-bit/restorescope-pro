import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Save, MessageSquare } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const JOB_TYPES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Smoke Damage', 'Sewage Cleanup', 'Emergency Services', 'Reconstruction'];

function Field({ label, req, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">
        {label}{req && <span className="text-orange-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function ReviewRequestForm({ companyId, userEmail }) {
  const qc = useQueryClient();

  const { data: profileArr = [] } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const profile = profileArr[0];

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    job_type: 'Water Damage',
    city: '',
    technician: '',
    review_link: '',
  });

  useEffect(() => {
    if (profile?.google_review_link) {
      setForm(f => ({ ...f, review_link: profile.google_review_link }));
    }
  }, [profile?.google_review_link]);
  const [generatedSms, setGeneratedSms] = useState('');
  const [generating, setGenerating] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const generateMsg = async () => {
    if (!form.customer_name) {
      toast({ title: 'Enter customer name first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const prompt = `Write a friendly, professional SMS review request message for a restoration company.

Customer: ${form.customer_name}
Job Type: ${form.job_type}
City: ${form.city || 'their area'}
Technician: ${form.technician || 'our team'}
Review Link: ${form.review_link}

Rules:
- Keep it under 160 characters
- Friendly and personal, not salesy
- Include the review link
- No spam words, no all-caps
- End with the link naturally
- Never use the word "trauma", "compassionate", or "junk"

Return ONLY the SMS message text, nothing else.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setGeneratedSms(typeof result === 'string' ? result : result?.text || '');
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ReviewRequest.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-requests', companyId] });
      toast({ title: '✅ Review request saved' });
      setForm({ customer_name: '', phone: '', email: '', job_type: 'Water Damage', city: '', technician: '', review_link: profile?.google_review_link || '' });
      setGeneratedSms('');
    },
  });

  const handleSave = () => {
    if (!form.customer_name) {
      toast({ title: 'Customer name required', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({
      ...form,
      company_id: companyId,
      generated_sms: generatedSms,
      status: 'pending',
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <MessageSquare size={14} style={{ color: '#e05a1c' }} />
        <h2 className="text-sm font-semibold text-white">New Review Request</h2>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Customer Name" req>
            <input className={inp} placeholder="Jane Smith" value={form.customer_name} onChange={set('customer_name')} />
          </Field>
          <Field label="Phone">
            <input className={inp} placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Email">
            <input type="email" className={inp} placeholder="jane@example.com" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Job Type">
            <select className={inp} value={form.job_type} onChange={set('job_type')}>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="City">
            <input className={inp} placeholder="Nashville" value={form.city} onChange={set('city')} />
          </Field>
          <Field label="Technician">
            <input className={inp} placeholder="Mike Johnson" value={form.technician} onChange={set('technician')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Review Link">
              <input className={inp} placeholder="https://g.page/r/…/review" value={form.review_link} onChange={set('review_link')} />
            </Field>
          </div>
        </div>

        {/* Generate SMS */}
        <div>
          <button onClick={generateMsg} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            style={{ background: '#1e3a5a', border: '1px solid #3a5a7c' }}>
            {generating
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Zap size={13} style={{ color: '#e05a1c' }} />}
            Generate SMS Message
          </button>
        </div>

        {generatedSms && (
          <div className="rounded-xl border p-4 space-y-2" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Generated SMS</label>
            <textarea
              className={inp + ' resize-none'}
              rows={4}
              value={generatedSms}
              onChange={e => setGeneratedSms(e.target.value)}
            />
            <div className="flex items-center justify-between text-xs" style={{ color: '#3a5a7c' }}>
              <span>{generatedSms.length} / 160 chars</span>
              <button onClick={() => { navigator.clipboard.writeText(generatedSms); toast({ title: 'Copied!' }); }}
                className="hover:text-white transition">Copy</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            style={{ background: '#e05a1c' }}>
            {saveMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
            Save Request
          </button>
        </div>
      </div>
    </div>
  );
}