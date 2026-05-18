import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit, Save, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm';

const emptyProperty = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  zip: '',
};

export default function JobProperty({ job }) {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const propertyId = job?.property_id;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyProperty);

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    enabled: !!propertyId,
    queryFn: () => base44.entities.Property.get(propertyId),
  });

  useEffect(() => {
    if (property) {
      setForm({
        address_line_1: property.address_line_1 || '',
        address_line_2: property.address_line_2 || '',
        city: property.city || '',
        state: property.state || '',
        zip: property.zip || '',
      });
    }
  }, [property]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Missing company — complete company setup first.');
      if (!job?.id) throw new Error('Job not loaded yet.');

      const payload = { ...form, company_id: companyId, is_deleted: false };

      if (propertyId) {
        await base44.entities.Property.update(propertyId, payload);
      } else {
        const newProperty = await base44.entities.Property.create(payload);
        // Link the new property to the job
        await base44.functions.invoke('updateJob', {
          job_id: job.id,
          updates: { property_id: newProperty.id },
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      await queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      setEditing(false);
      toast({ title: 'Property saved' });
    },
    onError: (err) => {
      toast({ title: 'Failed to save property', description: err?.message || 'Please try again.', variant: 'destructive' });
    },
  });

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  if (!job) return null;

  if (editing) {
    return (
      <div className="space-y-3">
        <input className={inputCls} placeholder="Address" value={form.address_line_1} onChange={update('address_line_1')} />
        <input className={inputCls} placeholder="Address 2" value={form.address_line_2} onChange={update('address_line_2')} />
        <input className={inputCls} placeholder="City" value={form.city} onChange={update('city')} />
        <input className={inputCls} placeholder="State" value={form.state} onChange={update('state')} />
        <input className={inputCls} placeholder="ZIP" value={form.zip} onChange={update('zip')} />

        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(false)} className="px-3 h-9 rounded-lg border text-sm hover:bg-muted transition">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <Building2 size={16} /> Property
      </h2>

      {property ? (
        <>
          <p>{property.address_line_1}</p>
          <p>{property.city}, {property.state}</p>
          <p>{property.zip}</p>
        </>
      ) : (
        <p className="text-muted-foreground">No property linked</p>
      )}

      <button onClick={() => setEditing(true)} className="text-primary">
        <Edit size={14} /> {property ? 'Edit' : 'Add Property'}
      </button>
    </div>
  );
}