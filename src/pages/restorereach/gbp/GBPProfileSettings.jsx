import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, Building2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const HOURS_DEFAULT = 'Mon-Fri: 8am-6pm, Sat: 9am-3pm, Sun: Closed';

export default function GBPProfileSettings({ profile, companyId, userEmail }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    company_name: '',
    google_business_profile_url: '',
    google_review_link: '',
    phone: '',
    website: '',
    gbp_categories: '',
    gbp_description: '',
    gbp_hours: HOURS_DEFAULT,
    service_area: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        company_name: profile.company_name || '',
        google_business_profile_url: profile.google_business_profile_url || '',
        google_review_link: profile.google_review_link || '',
        phone: profile.phone || '',
        website: profile.website || '',
        gbp_categories: profile.gbp_categories || '',
        gbp_description: profile.gbp_description || '',
        gbp_hours: profile.gbp_hours || HOURS_DEFAULT,
        service_area: profile.service_area || '',
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profile?.id) {
        return base44.entities.RRCompanyProfile.update(profile.id, data);
      } else {
        return base44.entities.RRCompanyProfile.create({ ...data, created_by: userEmail, company_id: companyId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-profile'] });
      toast({ title: 'GBP profile saved' });
    },
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Building2 size={15} style={{ color: '#e05a1c' }} /> GBP Profile Settings
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-400 mb-1 block">Business Name</label>
          <input className={inp} style={inpStyle} placeholder="Acme Restoration LLC" value={form.company_name} onChange={set('company_name')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Phone</label>
          <input className={inp} style={inpStyle} placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Website</label>
          <input className={inp} style={inpStyle} placeholder="https://yoursite.com" value={form.website} onChange={set('website')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">GBP Profile URL</label>
          <input className={inp} style={inpStyle} placeholder="https://business.google.com/..." value={form.google_business_profile_url} onChange={set('google_business_profile_url')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Review Link</label>
          <input className={inp} style={inpStyle} placeholder="https://g.page/r/..." value={form.google_review_link} onChange={set('google_review_link')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Categories (comma-separated)</label>
          <input className={inp} style={inpStyle} placeholder="Water Damage, Mold Remediation, Fire Restoration" value={form.gbp_categories} onChange={set('gbp_categories')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Service Areas</label>
          <input className={inp} style={inpStyle} placeholder="Nashville TN, Murfreesboro TN" value={form.service_area} onChange={set('service_area')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Business Hours</label>
          <input className={inp} style={inpStyle} value={form.gbp_hours} onChange={set('gbp_hours')} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-400 mb-1 block">Business Description</label>
          <textarea className={inp} style={inpStyle} rows={3} placeholder="Describe your services and what makes you stand out…" value={form.gbp_description} onChange={set('gbp_description')} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition"
          style={{ background: '#e05a1c' }}>
          <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}