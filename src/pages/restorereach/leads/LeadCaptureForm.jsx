import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Save, Upload, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const SERVICES = [
  'Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage',
  'Smoke Damage', 'Sewage Cleanup', 'Emergency Services', 'Reconstruction', 'Other',
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function calcUrgency(form) {
  let score = 0;
  if (form.standing_water) score += 30;
  if (form.sewage_involved) score += 35;
  if (form.visible_mold) score += 25;
  if (form.service_needed === 'Emergency Services') score += 20;
  if (form.service_needed === 'Sewage Cleanup') score += 15;
  if (form.service_needed === 'Water Damage') score += 10;
  if (form.insurance_involved) score += 5;
  return Math.min(score, 100);
}

function urgencyLabel(score) {
  if (score >= 70) return { label: 'Critical', color: '#dc2626', bg: '#dc262620' };
  if (score >= 40) return { label: 'High', color: '#ef4444', bg: '#ef444420' };
  if (score >= 20) return { label: 'Medium', color: '#f59e0b', bg: '#f59e0b20' };
  return { label: 'Standard', color: '#10b981', bg: '#10b98120' };
}

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

function Toggle({ label, checked, onChange, color = '#ef4444' }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition w-full text-left"
      style={checked
        ? { background: color + '20', borderColor: color + '60', color }
        : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
      <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition"
        style={checked ? { background: color, borderColor: color } : { borderColor: '#3a5a7c' }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {label}
    </button>
  );
}

const EMPTY = {
  customer_name: '', phone: '', email: '', address: '', city: '', state: 'MO', zip: '',
  service_needed: 'Water Damage', what_happened: '',
  standing_water: false, visible_mold: false, sewage_involved: false, insurance_involved: false,
  insurance_company: '', photos: [],
};

export default function LeadCaptureForm({ companyId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const toggle = (k) => (val) => setForm(f => ({ ...f, [k]: val }));

  const urgencyScore = calcUrgency(form);
  const urgency = urgencyLabel(urgencyScore);

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url)));
      setForm(f => ({ ...f, photos: [...f.photos, ...urls] }));
    } catch {
      toast({ title: 'Photo upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx) => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.RRLeadCapture.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-leads'] });
      toast({ title: '✅ Lead captured successfully' });
      setForm(EMPTY);
    },
  });

  const handleSave = () => {
    if (!form.customer_name.trim()) {
      toast({ title: 'Customer name required', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({
      company_id: companyId,
      customer_name: form.customer_name,
      phone: form.phone,
      email: form.email,
      property_address: [form.address, form.city, form.state, form.zip].filter(Boolean).join(', '),
      service_needed: form.service_needed,
      notes: [
        form.what_happened,
        form.standing_water ? '⚠️ Standing water present' : '',
        form.visible_mold ? '⚠️ Visible mold' : '',
        form.sewage_involved ? '⚠️ Sewage involved' : '',
        form.insurance_involved ? `Insurance: ${form.insurance_company || 'Unknown carrier'}` : '',
      ].filter(Boolean).join('\n'),
      urgency_level: urgencyScore >= 70 ? 'emergency' : urgencyScore >= 40 ? 'urgent' : urgencyScore >= 20 ? 'standard' : 'quote_only',
      source: 'direct',
      photos: form.photos,
      status: 'new',
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">New Emergency Lead</h2>
        </div>
        {/* Live urgency score */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#7ba3c8' }}>Urgency:</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: urgency.bg, color: urgency.color }}>
            {urgency.label} ({urgencyScore})
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Contact Info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Contact Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Customer Name" req>
              <input className={inp} placeholder="Jane Smith" value={form.customer_name} onChange={set('customer_name')} />
            </Field>
            <Field label="Phone">
              <input className={inp} placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email">
                <input type="email" className={inp} placeholder="jane@example.com" value={form.email} onChange={set('email')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Property */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Property Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Street Address">
                <input className={inp} placeholder="123 Main St" value={form.address} onChange={set('address')} />
              </Field>
            </div>
            <Field label="City">
              <input className={inp} placeholder="Nashville" value={form.city} onChange={set('city')} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="State">
                <select className={inp} value={form.state} onChange={set('state')}>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Zip">
                <input className={inp} placeholder="37201" value={form.zip} onChange={set('zip')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Job Details</p>
          <div className="space-y-3">
            <Field label="Service Needed">
              <select className={inp} value={form.service_needed} onChange={set('service_needed')}>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="What Happened?">
              <textarea className={inp + ' resize-none'} rows={3}
                placeholder="Describe the damage situation…"
                value={form.what_happened} onChange={set('what_happened')} />
            </Field>
          </div>
        </div>

        {/* Damage Flags */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Damage Flags <span className="normal-case font-normal text-xs" style={{ color: '#3a5a7c' }}>(affects urgency score)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Toggle label="Standing Water Present" checked={form.standing_water} onChange={toggle('standing_water')} color="#3b82f6" />
            <Toggle label="Visible Mold" checked={form.visible_mold} onChange={toggle('visible_mold')} color="#f59e0b" />
            <Toggle label="Sewage Involved" checked={form.sewage_involved} onChange={toggle('sewage_involved')} color="#dc2626" />
            <Toggle label="Insurance Involved" checked={form.insurance_involved} onChange={toggle('insurance_involved')} color="#10b981" />
          </div>
          {form.insurance_involved && (
            <div className="mt-2">
              <Field label="Insurance Company">
                <input className={inp} placeholder="State Farm, Allstate…" value={form.insurance_company} onChange={set('insurance_company')} />
              </Field>
            </div>
          )}
        </div>

        {/* Photos */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Photo Uploads</p>
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border text-sm transition hover:border-orange-500/50"
            style={{ background: '#0a1020', borderColor: '#1e2d45', borderStyle: 'dashed', color: '#7ba3c8' }}>
            <Upload size={14} style={{ color: '#e05a1c' }} />
            {uploading ? 'Uploading…' : 'Click to upload photos'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} disabled={uploading} />
          </label>
          {form.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.photos.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" style={{ borderColor: '#1e2d45' }} />
                  <button onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    style={{ background: '#dc2626' }}>
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgency bar */}
        <div className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: urgency.color }}>Auto Urgency Score: {urgencyScore}/100</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: urgency.bg, color: urgency.color }}>{urgency.label}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${urgencyScore}%`, background: urgency.color }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#3a5a7c' }}>
            Standing water +30 · Sewage +35 · Mold +25 · Emergency service +20
          </p>
        </div>

        <button onClick={handleSave} disabled={saveMutation.isPending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {saveMutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save size={14} />}
          Save Lead
        </button>
      </div>
    </div>
  );
}