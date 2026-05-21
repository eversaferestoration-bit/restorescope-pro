import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SERVICES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Sewage Cleanup', 'Other'];
const SOURCES = ['Direct', 'Referral', 'Website', 'Phone', 'Google', 'Other'];
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function NewLeadModal({ companyId, onClose, onCreated }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    service_type: 'Water Damage',
    source: 'Direct',
    estimated_value: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({
      ...data,
      company_id: companyId,
      pipeline_stage: 'new',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      onCreated?.();
    },
    onError: (error) => {
      toast({
        title: '❌ Failed to create lead',
        description: error?.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!form.customer_name || !form.phone) {
      toast({ title: 'Name and phone are required', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      ...form,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
    });
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card">
          <h2 className="text-lg font-semibold">New Lead</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Name *</label>
              <input
                type="text"
                placeholder="John Smith"
                value={form.customer_name}
                onChange={set('customer_name')}
                className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Phone *</label>
              <input
                type="tel"
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={set('phone')}
                className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
            <input
              type="email"
              placeholder="john@email.com"
              value={form.email}
              onChange={set('email')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Service Type</label>
            <select value={form.service_type} onChange={set('service_type')} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Address</label>
            <input
              type="text"
              placeholder="123 Main St"
              value={form.address}
              onChange={set('address')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="City"
              value={form.city}
              onChange={set('city')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select value={form.state} onChange={set('state')} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">—</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="text"
              placeholder="Zip"
              value={form.zip}
              onChange={set('zip')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Source</label>
              <select value={form.source} onChange={set('source')} className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Est. Value</label>
              <input
                type="number"
                placeholder="$5,000"
                value={form.estimated_value}
                onChange={set('estimated_value')}
                className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
            <textarea
              placeholder="Any initial notes…"
              value={form.notes}
              onChange={set('notes')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none h-20"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#3b82f6' }}>
            {createMutation.isPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {createMutation.isPending ? 'Creating…' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}