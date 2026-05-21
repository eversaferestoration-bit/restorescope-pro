import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SERVICES = ['Water Damage', 'Fire & Smoke', 'Mold Remediation', 'Storm Damage', 'Sewage', 'Flood', 'Other'];

export default function LeadCreateForm({ companyId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    service_type: '',
    property_address: '',
    city: '',
    state: '',
    zip: '',
    estimated_value: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMLead.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      toast({ title: '✅ Lead created' });
      onClose();
    },
    onError: (error) => {
      toast({ title: '❌ Failed to create', description: error?.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.phone) {
      toast({ title: 'Customer name and phone required' });
      return;
    }
    createMutation.mutate({
      company_id: companyId,
      customer_name: form.customer_name,
      phone: form.phone,
      email: form.email,
      service_type: form.service_type,
      property_address: form.property_address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      pipeline_stage: 'new',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Lead</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Name *</label>
              <input className="w-full px-3 py-2 rounded border" value={form.customer_name} onChange={set('customer_name')} placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone *</label>
              <input className="w-full px-3 py-2 rounded border" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input className="w-full px-3 py-2 rounded border" value={form.email} onChange={set('email')} type="email" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Service</label>
              <select className="w-full px-3 py-2 rounded border" value={form.service_type} onChange={set('service_type')}>
                <option value="">Select…</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1">Property Address</label>
              <input className="w-full px-3 py-2 rounded border" value={form.property_address} onChange={set('property_address')} placeholder="123 Main St" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">City</label>
              <input className="w-full px-3 py-2 rounded border" value={form.city} onChange={set('city')} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">State</label>
              <input className="w-full px-3 py-2 rounded border" value={form.state} onChange={set('state')} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Zip</label>
              <input className="w-full px-3 py-2 rounded border" value={form.zip} onChange={set('zip')} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Est. Value</label>
              <input className="w-full px-3 py-2 rounded border" value={form.estimated_value} onChange={set('estimated_value')} type="number" placeholder="0" />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              className="px-4 py-2 rounded bg-primary text-white font-semibold disabled:opacity-50">
              {createMutation.isPending ? 'Creating…' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}