import { Building2 } from 'lucide-react';
import StepNav from './StepNav';
import { base44 } from '@/api/base44Client';

export default function Step2Company({ form, setForm, onBack, onContinue, loading }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, logo_url: file_url }));
  };

  return (
    <div>
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Building2 size={20} className="text-primary" />
      </div>
      <h2 className="text-xl font-semibold font-display mb-1">Your company</h2>
      <p className="text-sm text-muted-foreground mb-6">This appears on your estimates and exports.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Company name <span className="text-destructive">*</span></label>
          <input
            type="text"
            value={form.company_name}
            onChange={set('company_name')}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Acme Restoration LLC"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="(555) 000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="hello@company.com"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Primary service area</label>
          <input
            type="text"
            value={form.service_area}
            onChange={set('service_area')}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Dallas, TX metro area"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Logo <span className="text-muted-foreground text-xs">(optional)</span></label>
          <div className="flex items-center gap-3">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-contain border border-border" />
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-input bg-background text-xs font-medium hover:bg-muted transition">
              Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>
      </div>

      <StepNav
        onBack={onBack}
        onContinue={onContinue}
        disabled={!form.company_name.trim()}
        loading={loading}
      />
    </div>
  );
}