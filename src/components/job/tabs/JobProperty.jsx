import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit, Save, X } from 'lucide-react';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm';

const emptyProperty = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
};

export default function JobProperty({ job }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companyId = user?.company_id;
  const propertyId = job?.property_id;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyProperty);

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const res = await base44.entities.Property.filter({
        id: propertyId,
        company_id: companyId,
        is_deleted: false,
      });
      return res?.[0] || null;
    },
  });

  useEffect(() => {
    if (property) {
      setForm({
        address_line_1: property.address_line_1 || '',
        address_line_2: property.address_line_2 || '',
        city: property.city || '',
        state: property.state || '',
        postal_code: property.postal_code || '',
      });
    }
  }, [property]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Missing company');

      let newPropertyId = propertyId;

      const payload = {
        ...form,
        company_id: companyId,
        is_deleted: false,
      };

      if (propertyId) {
        await base44.entities.Property.update(propertyId, payload);
      } else {
        const newProperty = await base44.entities.Property.create(payload);
        newPropertyId = newProperty.id;

        // LINK TO JOB (THIS WAS MISSING)
        await base44.entities.Job.update(job.id, {
          property_id: newPropertyId,
        });
      }

      return newPropertyId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      await queryClient.invalidateQueries({ queryKey: ['property'] });
      setEditing(false);
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
        <input className={inputCls} placeholder="ZIP" value={form.postal_code} onChange={update('postal_code')} />

        <button
          onClick={() => saveMutation.mutate()}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          <Save size={14} /> Save
        </button>
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
          <p>{property.postal_code}</p>
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