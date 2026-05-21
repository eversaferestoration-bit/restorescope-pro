import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Settings, Save, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const SERVICES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Smoke Damage', 'Sewage Cleanup', 'Asbestos', 'Biohazard'];
const VOICE_OPTIONS = ['Professional and empathetic', 'Urgent and action-oriented', 'Friendly and community-focused', 'Expert and authoritative', 'Compassionate and reassuring'];

export default function RRSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const existing = profiles?.[0];

  const [form, setForm] = useState({
    company_name: '', owner_name: '', phone: '', email: '', website: '',
    address: '', city: '', state: '', zip: '', service_radius_miles: 50,
    primary_services: [], brand_voice: 'Professional and empathetic',
    google_business_profile_url: '', google_review_link: '',
    facebook_url: '', instagram_url: '', linkedin_url: '',
  });

  useEffect(() => {
    if (existing) setForm((f) => ({ ...f, ...existing }));
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, created_by: user?.email };
      if (existing?.id) return base44.entities.RRCompanyProfile.update(existing.id, payload);
      return base44.entities.RRCompanyProfile.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-profile'] });
      toast({ title: '✅ Company profile saved' });
    },
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));
  const toggleService = (s) => setForm((f) => ({
    ...f,
    primary_services: f.primary_services?.includes(s)
      ? f.primary_services.filter(x => x !== s)
      : [...(f.primary_services || []), s],
  }));

  const Section = ({ title, children }) => (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <h2 className="text-sm font-semibold text-white border-b pb-3" style={{ borderColor: '#1e2d45' }}>{title}</h2>
      {children}
    </div>
  );

  const Field = ({ label, children }) => (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="p-5 md:p-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings size={22} style={{ color: '#e05a1c' }} /> Settings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Configure your company profile for AI content generation</p>
        </div>
        <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ background: '#e05a1c' }}>
          {saveMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
          {saveMutation.isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      <div className="space-y-5">
        <Section title="🏢 Company Information">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Company Name *">
                <input className={inp} style={inpStyle} placeholder="ABC Restoration Co." value={form.company_name} onChange={set('company_name')} />
              </Field>
            </div>
            <Field label="Owner Name">
              <input className={inp} style={inpStyle} placeholder="John Smith" value={form.owner_name} onChange={set('owner_name')} />
            </Field>
            <Field label="Phone">
              <input className={inp} style={inpStyle} placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="Email">
              <input className={inp} style={inpStyle} placeholder="info@company.com" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Website">
              <input className={inp} style={inpStyle} placeholder="https://yoursite.com" value={form.website} onChange={set('website')} />
            </Field>
            <div className="col-span-2">
              <Field label="Address">
                <input className={inp} style={inpStyle} placeholder="123 Main St" value={form.address} onChange={set('address')} />
              </Field>
            </div>
            <Field label="City">
              <input className={inp} style={inpStyle} placeholder="Nashville" value={form.city} onChange={set('city')} />
            </Field>
            <Field label="State">
              <input className={inp} style={inpStyle} placeholder="TN" value={form.state} onChange={set('state')} />
            </Field>
            <Field label="ZIP">
              <input className={inp} style={inpStyle} placeholder="37201" value={form.zip} onChange={set('zip')} />
            </Field>
            <Field label="Service Radius (miles)">
              <input type="number" className={inp} style={inpStyle} value={form.service_radius_miles} onChange={set('service_radius_miles')} />
            </Field>
          </div>
        </Section>

        <Section title="🔧 Services & Brand Voice">
          <Field label="Primary Services">
            <div className="flex flex-wrap gap-2 mt-1">
              {SERVICES.map(s => (
                <button key={s} onClick={() => toggleService(s)} type="button"
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${form.primary_services?.includes(s) ? 'text-white border-orange-500' : 'text-slate-400 border-slate-700 hover:border-slate-500'}`}
                  style={form.primary_services?.includes(s) ? { background: '#e05a1c22' } : { background: '#0a1020' }}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Brand Voice">
            <select className={inp} style={inpStyle} value={form.brand_voice} onChange={set('brand_voice')}>
              {VOICE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="📍 Google & Review Links">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Google Business Profile URL">
              <input className={inp} style={inpStyle} placeholder="https://business.google.com/…" value={form.google_business_profile_url} onChange={set('google_business_profile_url')} />
            </Field>
            <Field label="Google Review Shortlink">
              <input className={inp} style={inpStyle} placeholder="https://g.page/r/…/review" value={form.google_review_link} onChange={set('google_review_link')} />
            </Field>
          </div>
        </Section>

        <Section title="📱 Social Media">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Facebook URL">
              <input className={inp} style={inpStyle} placeholder="https://facebook.com/yourpage" value={form.facebook_url} onChange={set('facebook_url')} />
            </Field>
            <Field label="Instagram URL">
              <input className={inp} style={inpStyle} placeholder="https://instagram.com/yourhandle" value={form.instagram_url} onChange={set('instagram_url')} />
            </Field>
            <Field label="LinkedIn URL">
              <input className={inp} style={inpStyle} placeholder="https://linkedin.com/company/…" value={form.linkedin_url} onChange={set('linkedin_url')} />
            </Field>
          </div>
        </Section>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={() => saveMutation.mutate(form)} disabled={!form.company_name || saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ background: '#e05a1c' }}>
          {saveMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={14} />}
          {saveMutation.isPending ? 'Saving…' : 'Save Company Profile'}
        </button>
      </div>
    </div>
  );
}