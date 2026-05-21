import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Edit2, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function LeadInfo({ lead }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    customer_name: lead.customer_name,
    phone: lead.phone,
    email: lead.email || '',
    address: lead.address || '',
    city: lead.city || '',
    state: lead.state || '',
    zip: lead.zip || '',
    service_type: lead.service_type || '',
    estimated_value: lead.estimated_value || '',
    notes: lead.notes || '',
    assigned_to_name: lead.assigned_to_name || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(lead.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', lead.id] });
      setEditing(false);
      toast({ title: '✅ Lead updated' });
    },
    onError: (err) => {
      toast({
        title: '❌ Failed to update',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Customer Information</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition text-sm font-medium">
            <Edit2 size={14} /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setForm({
                  customer_name: lead.customer_name,
                  phone: lead.phone,
                  email: lead.email || '',
                  address: lead.address || '',
                  city: lead.city || '',
                  state: lead.state || '',
                  zip: lead.zip || '',
                  service_type: lead.service_type || '',
                  estimated_value: lead.estimated_value || '',
                  notes: lead.notes || '',
                  assigned_to_name: lead.assigned_to_name || '',
                });
                setEditing(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition text-sm">
              <X size={14} />
            </button>
            <button
              onClick={() => updateMutation.mutate({
                ...form,
                estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
              })}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition text-sm disabled:opacity-50">
              <Check size={14} /> {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className={`rounded-xl border p-6 grid grid-cols-2 gap-6 ${editing ? 'bg-muted/30' : 'bg-card'}`}>
        {[
          { label: 'Name', key: 'customer_name', req: true },
          { label: 'Phone', key: 'phone', req: true },
          { label: 'Email', key: 'email' },
          { label: 'Service Type', key: 'service_type' },
          { label: 'Address', key: 'address' },
          { label: 'City', key: 'city' },
          { label: 'State', key: 'state' },
          { label: 'Zip', key: 'zip' },
          { label: 'Estimated Value', key: 'estimated_value', type: 'number' },
          { label: 'Assigned To', key: 'assigned_to_name' },
        ].map(field => (
          <div key={field.key}>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {field.label}{field.req && '*'}
            </label>
            {editing ? (
              <input
                type={field.type || 'text'}
                value={form[field.key]}
                onChange={set(field.key)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="text-foreground">{form[field.key] || '—'}</p>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="rounded-xl border p-6 bg-card">
        <label className="text-xs font-medium text-muted-foreground block mb-3">Notes</label>
        {editing ? (
          <textarea
            value={form.notes}
            onChange={set('notes')}
            className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none h-24"
            placeholder="Any notes about this lead…"
          />
        ) : (
          <p className="text-foreground whitespace-pre-wrap">{form.notes || 'No notes'}</p>
        )}
      </div>
    </div>
  );
}