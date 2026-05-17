import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Save, X, MapPin } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

const emptyForm = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  property_type: '',
  year_built: '',
};

export default function PropertySelector({ value, onChange, jobId, companyId: companyIdProp }) {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();

  // Accept companyId as prop (from NewJob which resolves it), or fall back to userProfile
  const companyId = companyIdProp || userProfile?.company_id;

  const [mode, setMode] = useState('select');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const propertyQuery = useQuery({
    queryKey: ['properties', companyId],
    enabled: !!companyId,
    queryFn: () =>
      base44.entities.Property.filter({ company_id: companyId, is_deleted: false }),
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

  const formatAddress = (p) =>
    [p.address_line_1, p.address_line_2, p.city, p.state, p.postal_code].filter(Boolean).join(', ');

  const linkToJob = async (propertyId) => {
    if (!jobId) return;
    await base44.entities.Job.update(jobId, { property_id: propertyId });
    await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Missing company');
      if (!form.address_line_1.trim()) throw new Error('Address is required');
      return await base44.entities.Property.create({
        ...form,
        year_built: form.year_built ? Number(form.year_built) : null,
        company_id: companyId,
        is_deleted: false,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['properties', companyId] });
      await linkToJob(created.id);
      onChange(created);
      setForm(emptyForm);
      setMode('select');
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const selectProperty = async (property) => {
    await linkToJob(property.id);
    onChange(property);
  };

  const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-3">
      {value && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{value.address_line_1}</p>
            <p className="text-xs text-muted-foreground">
              {[value.city, value.state, value.postal_code].filter(Boolean).join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('select')}
          className={`min-h-touch px-3 rounded-lg border text-sm font-medium transition ${
            mode === 'select'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:bg-muted'
          }`}
        >
          Select Existing
        </button>
        <button
          type="button"
          onClick={() => { setMode('create'); setError(''); }}
          className={`inline-flex items-center gap-1.5 min-h-touch px-3 rounded-lg border text-sm font-medium transition ${
            mode === 'create'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:bg-muted'
          }`}
        >
          <Plus size={14} /> New Property
        </button>
      </div>

      {mode === 'select' && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address, city, state, or ZIP..."
            />
          </div>

          {propertyQuery.isLoading && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Loading...</div>
          )}

          {!propertyQuery.isLoading && filtered.length === 0 && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              No property records found. Use New Property to create one.
            </div>
          )}

          {filtered.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border border-border divide-y divide-border">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProperty(p)}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2.5 transition hover:bg-muted ${
                    value?.id === p.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <MapPin size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{p.address_line_1}</p>
                    <p className="text-xs text-muted-foreground">{[p.city, p.state].filter(Boolean).join(', ')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'create' && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs font-semibold">New Property</p>
          <input className={inputCls} placeholder="Street address *" value={form.address_line_1} onChange={update('address_line_1')} />
          <input className={inputCls} placeholder="Address line 2" value={form.address_line_2} onChange={update('address_line_2')} />
          <div className="grid grid-cols-3 gap-3">
            <input className={`${inputCls} col-span-2`} placeholder="City" value={form.city} onChange={update('city')} />
            <input className={inputCls} placeholder="State" value={form.state} onChange={update('state')} maxLength={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="ZIP" value={form.postal_code} onChange={update('postal_code')} />
            <input type="number" className={inputCls} placeholder="Year built" value={form.year_built} onChange={update('year_built')} />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setMode('select')}
              className="px-3 min-h-touch rounded-lg border border-border text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              <Save size={13} /> {createMutation.isPending ? 'Saving...' : 'Save Property'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}