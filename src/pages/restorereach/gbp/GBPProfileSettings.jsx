import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const CATEGORIES = [
  'Water Damage Restoration', 'Fire Damage Restoration', 'Mold Remediation',
  'Storm Damage Restoration', 'Smoke Damage Restoration', 'Sewage Cleanup',
  'Asbestos Removal', 'Biohazard Cleanup', 'Reconstruction', 'Emergency Services',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function GBPProfileSettings({ profile, user }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    company_name: '',
    google_business_profile_url: '',
    google_review_link: '',
    gbp_categories: [],
    gbp_description: '',
    phone: '',
    website: '',
    gbp_hours: {},
    service_areas_text: '',
  });

  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        company_name: profile.company_name || '',
        google_business_profile_url: profile.google_business_profile_url || '',
        google_review_link: profile.google_review_link || '',
        gbp_categories: profile.gbp_categories || [],
        gbp_description: profile.gbp_description || '',
        phone: profile.phone || '',
        website: profile.website || '',
        gbp_hours: profile.gbp_hours || {},
        service_areas_text: profile.service_areas_text || '',
      }));
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, created_by: user?.email };
      if (profile?.id) return base44.entities.RRCompanyProfile.update(profile.id, payload);
      return base44.entities.RRCompanyProfile.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-profile'] });
      toast({ title: '✅ GBP profile saved' });
    },
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const toggleCategory = (cat) => setForm(f => ({
    ...f,
    gbp_categories: f.gbp_categories.includes(cat)
      ? f.gbp_categories.filter(c => c !== cat)
      : [...f.gbp_categories, cat],
  }));

  const setHours = (day, val) => setForm(f => ({
    ...f,
    gbp_hours: { ...f.gbp_hours, [day]: val },
  }));

  const F = ({ label, req, children }) => (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">
        {label}{req && <span className="text-orange-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="rounded-xl border p-5 space-y-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: '#1e2d45' }}>
        <h2 className="text-sm font-semibold text-white">GBP Profile Settings</h2>
        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={!form.company_name || saveMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
          style={{ background: '#e05a1c' }}>
          {saveMutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save size={13} />}
          Save
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-full">
          <F label="Business Name" req>
            <input className={inp} style={inpStyle} placeholder="ABC Restoration Co." value={form.company_name} onChange={set('company_name')} />
          </F>
        </div>

        <F label="GBP URL">
          <input className={inp} style={inpStyle} placeholder="https://business.google.com/…" value={form.google_business_profile_url} onChange={set('google_business_profile_url')} />
        </F>

        <F label="Google Review Link">
          <input className={inp} style={inpStyle} placeholder="https://g.page/r/…/review" value={form.google_review_link} onChange={set('google_review_link')} />
        </F>

        <F label="Phone">
          <input className={inp} style={inpStyle} placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
        </F>

        <F label="Website">
          <input className={inp} style={inpStyle} placeholder="https://yoursite.com" value={form.website} onChange={set('website')} />
        </F>

        <div className="col-span-full">
          <F label="Business Description (GBP)">
            <textarea className={inp} style={inpStyle} rows={3} placeholder="Describe your restoration services for your Google Business Profile…" value={form.gbp_description} onChange={set('gbp_description')} />
          </F>
        </div>

        <div className="col-span-full">
          <F label="Service Areas (comma-separated cities)">
            <input className={inp} style={inpStyle} placeholder="Nashville, Franklin, Brentwood, Murfreesboro" value={form.service_areas_text} onChange={set('service_areas_text')} />
          </F>
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">GBP Categories</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} type="button" onClick={() => toggleCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${form.gbp_categories.includes(cat) ? 'border-orange-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
              style={form.gbp_categories.includes(cat) ? { background: '#e05a1c22' } : { background: '#0a1020' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Hours */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">Business Hours</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-xs w-24 shrink-0" style={{ color: '#7ba3c8' }}>{day}</span>
              <input
                className="flex-1 px-2 py-1.5 rounded-lg border text-sm text-white placeholder-slate-600 focus:outline-none text-xs"
                style={{ background: '#0a1020', borderColor: '#1e2d45' }}
                placeholder="9:00 AM – 5:00 PM"
                value={form.gbp_hours[day] || ''}
                onChange={e => setHours(day, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}