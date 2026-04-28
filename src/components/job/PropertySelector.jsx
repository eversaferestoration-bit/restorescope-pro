import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Save, X } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm';

const emptyForm = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  property_type: '',
  year_built: '',
};

export default function PropertySelector({ value, onChange, jobId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companyId = user?.company_id;

  const [mode, setMode] = useState('select');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const propertyQuery = useQuery({
    queryKey: ['properties', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      return await base44.entities.Property.filter({
        company_id: companyId,
        is_deleted: false,
      });
    },
  });

  const properties = propertyQuery.data || [];

  const filtered = useMemo(() => {
    if (!search) return properties;

    const term = search.toLowerCase();

    return properties.filter((p) =>
      [p.address_line_1, p.city, p.state, p.postal_code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [properties, search]);

  // 🔥 CRITICAL: LINK TO JOB
  const linkToJob = async (propertyId) => {
    if (!jobId) return;

    await base44.entities.Job.update(jobId, {
      property_id: propertyId,
    });

    await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Missing company');

      if (!form.address_line_1.trim()) throw new Error('Address required');

      return await base44.entities.Property.create({
        ...form,
        company_id: companyId,
        is_deleted: false,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries(['properties', companyId]);

      await linkToJob(created.id); // FIX

      onChange(created);
      setForm(emptyForm);
      setMode('select');
    },
    onError: (err) => setError(err.message),
  });

  const selectProperty = async (property) => {
    await linkToJob(property.id); // FIX
    onChange(property);
  };

  const update = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="p-3 border rounded-lg bg-primary/5 flex justify-between">
          <div>
            <p className="font-medium">{value.address_line_1}</p>
            <p className="text-sm text-muted-foreground">
              {value.city}, {value.state}
            </p>
          </div>

          <button onClick={() => onChange(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setMode('select')}>Select</button>
        <button onClick={() => setMode('create')}>
          <Plus size={14} /> New
        </button>
      </div>

      {mode === 'select' && (
        <>
          <input
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search property"
          />

          {filtered.map((p) => (
            <button key={p.id} onClick={() => selectProperty(p)}>
              {p.address_line_1}
            </button>
          ))}
        </>
      )}

      {mode === 'create' && (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Address" value={form.address_line_1} onChange={update('address_line_1')} />
          <input className={inputCls} placeholder="City" value={form.city} onChange={update('city')} />
          <input className={inputCls} placeholder="State" value={form.state} onChange={update('state')} />

          <button onClick={() => createMutation.mutate()}>
            <Save size={14} /> Save
          </button>
        </div>
      )}
    </div>
  );
}