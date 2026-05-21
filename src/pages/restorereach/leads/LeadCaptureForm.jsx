import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, Upload, X, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition bg-[#0a1020] border-[#1e2d45]';

const SERVICES = [
  'Water Damage', 'Fire & Smoke', 'Mold Remediation', 'Storm Damage',
  'Sewage Cleanup', 'Flood Damage', 'Biohazard', 'Wind Damage', 'Other',
];

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function Field({ label, req, children, half }) {
  return (
    <div className={half ? '' : ''}>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">
        {label}{req && <span className="text-orange-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleField({ label, value, onChange, danger }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition w-full text-left"
      style={value
        ? { background: danger ? '#ef444420' : '#e05a1c20', borderColor: danger ? '#ef4444' : '#e05a1c', color: danger ? '#ef4444' : '#e05a1c' }
        : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${value ? 'border-current' : 'border-slate-600'}`}>
        {value && <span className="w-2 h-2 rounded-sm bg-current" />}
      </span>
      {label}
      {danger && value && <AlertTriangle size={13} className="ml-auto shrink-0" />}
    </button>
  );
}

function calculateUrgency(form) {
  let score = 0;
  const reasons = [];

  if (form.standing_water) { score += 30; reasons.push('Standing water present'); }
  if (form.sewage_involved) { score += 35; reasons.push('Sewage backup — biohazard risk'); }
  if (form.visible_mold) { score += 25; reasons.push('Visible mold detected'); }
  if (form.service_needed === 'Fire & Smoke') { score += 20; reasons.push('Fire/smoke damage'); }
  if (form.service_needed === 'Biohazard') { score += 30; reasons.push('Biohazard service'); }
  if (form.insurance_involved) { score += 10; reasons.push('Insurance claim involved'); }
  if (form.what_happened?.length > 50) { score += 5; reasons.push('Detailed damage description'); }

  score = Math.min(score, 100);
  let level = 'low';
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';

  return { score, level, reasons };
}

const URGENCY_CONFIG = {
  low:      { label: 'Low',      color: '#10b981', bg: '#10b98120' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: '#f59e0b20' },
  high:     { label: 'High',     color: '#ef4444', bg: '#ef444420' },
  critical: { label: 'CRITICAL', color: '#dc2626', bg: '#dc262620' },
};

const DEFAULT_FORM = {
  customer_name: '', phone: '', email: '', address: '',
  city: '', state: '', zip: '',
  service_needed: '', what_happened: '',
  standing_water: false, visible_mold: false,
  sewage_involved: false, insurance_involved: false,
  insurance_company: '', photos: [],
};

export default function LeadCaptureForm({ companyId, onCreated }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [uploading, setUploading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const toggle = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const urgency = calculateUrgency(form);
  const uc = URGENCY_CONFIG[urgency.level];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmergencyLead.create(data),
    onSuccess: (lead) => {
      qc.invalidateQueries({ queryKey: ['emergency-leads'] });
      qc.invalidateQueries({ queryKey: ['leads-count'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: '✅ Lead captured successfully!' });
      setForm({ ...DEFAULT_FORM });
      if (onCreated) onCreated(lead);
    },
    onError: (error) => {
      toast({
        title: '❌ Failed to capture lead',
        description: error?.message || 'Please check your connection and try again',
        variant: 'destructive',
      });
    },
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      }));
      setForm(f => ({ ...f, photos: [...(f.photos || []), ...urls] }));
      toast({ title: `${urls.length} photo(s) uploaded` });
    } catch (err) {
      toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx) => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.customer_name || !form.phone) {
      toast({ title: 'Customer name and phone are required', variant: 'destructive' });
      return;
    }
    if (!companyId) {
      toast({ title: 'Company not found', description: 'Please refresh and try again', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      ...form,
      company_id: companyId,
      status: 'new',
      urgency_score: urgency.score,
      urgency_level: urgency.level,
      urgency_reasons: urgency.reasons,
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <UserPlus size={14} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">New Emergency Lead</h2>
        </div>
        {/* Live urgency indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: uc.bg }}>
          <span className="text-xs font-bold" style={{ color: uc.color }}>Urgency: {uc.label}</span>
          <span className="text-xs font-mono font-bold" style={{ color: uc.color }}>{urgency.score}</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Contact Info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Contact Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Customer Name" req>
              <input className={inp} placeholder="John Smith" value={form.customer_name} onChange={set('customer_name')} />
            </Field>
            <Field label="Phone" req>
              <input className={inp} placeholder="(555) 000-0000" type="tel" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="Email">
              <input className={inp} placeholder="john@email.com" type="email" value={form.email} onChange={set('email')} />
            </Field>
          </div>
        </div>

        {/* Property Info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Property</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Address">
                <input className={inp} placeholder="123 Main St" value={form.address} onChange={set('address')} />
              </Field>
            </div>
            <Field label="City">
              <input className={inp} placeholder="Nashville" value={form.city} onChange={set('city')} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="State">
                <select className={inp} value={form.state} onChange={set('state')}>
                  <option value="">—</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Zip">
                <input className={inp} placeholder="37201" value={form.zip} onChange={set('zip')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Damage Info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Damage Details</p>
          <div className="space-y-3">
            <Field label="Service Needed">
              <div className="flex flex-wrap gap-1.5">
                {SERVICES.map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm(f => ({ ...f, service_needed: s }))}
                    className="text-xs px-2.5 py-1.5 rounded-lg border transition"
                    style={form.service_needed === s
                      ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                      : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="What Happened">
              <textarea className={inp + ' resize-none'} rows={3}
                placeholder="Describe the damage and how it occurred…"
                value={form.what_happened} onChange={set('what_happened')} />
            </Field>
          </div>
        </div>

        {/* Hazard Flags */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Hazard Flags</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ToggleField label="Standing Water" value={form.standing_water} onChange={toggle('standing_water')} danger />
            <ToggleField label="Visible Mold" value={form.visible_mold} onChange={toggle('visible_mold')} danger />
            <ToggleField label="Sewage Involved" value={form.sewage_involved} onChange={toggle('sewage_involved')} danger />
            <ToggleField label="Insurance Involved" value={form.insurance_involved} onChange={toggle('insurance_involved')} />
          </div>
          {form.insurance_involved && (
            <div className="mt-2">
              <Field label="Insurance Company">
                <input className={inp} placeholder="State Farm, Allstate…" value={form.insurance_company} onChange={set('insurance_company')} />
              </Field>
            </div>
          )}
        </div>

        {/* Urgency breakdown */}
        {urgency.reasons.length > 0 && (
          <div className="rounded-xl border p-4" style={{ background: '#0a1020', borderColor: uc.color + '50' }}>
            <p className="text-xs font-bold mb-2" style={{ color: uc.color }}>Urgency Factors ({urgency.score}/100)</p>
            <ul className="space-y-1">
              {urgency.reasons.map((r, i) => (
                <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: '#c8d9eb' }}>
                  <AlertTriangle size={10} style={{ color: uc.color }} />{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Photo Upload */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Photos</p>
          <label className="flex flex-col items-center justify-center w-full py-6 rounded-xl border-2 border-dashed cursor-pointer hover:bg-white/3 transition"
            style={{ borderColor: '#1e2d45' }}>
            <Upload size={20} style={{ color: '#3a5a7c' }} />
            <span className="text-xs mt-2" style={{ color: '#7ba3c8' }}>{uploading ? 'Uploading…' : 'Click to upload photos'}</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
          {form.photos?.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {form.photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={createMutation.isPending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {createMutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <UserPlus size={14} />}
          {createMutation.isPending ? 'Saving Lead…' : 'Capture Lead'}
        </button>
      </div>
    </div>
  );
}