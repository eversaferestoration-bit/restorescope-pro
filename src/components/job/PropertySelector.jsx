import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Save, X, Loader2 } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

const btnBase =
  'min-h-touch px-3 rounded-lg border text-sm font-medium transition';

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
    queryFn: async () =>
      base44.entities.Property.filter({ company_id: companyId, is_deleted: false }),
    staleTime: 5 * 60 * 1000,
  });

  const properties = propertyQuery.data || [];

  const filtered = useMemo(() => {
    if (!search) return properties;
    const term = search.toLowerCase();
    return properties.filter((p) =>
      [p.address_line_1, p.city, p.state, p.postal_code]
        .filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [properties, search]);

  const linkToJob = async (propertyId) => {
    if (!jobId) return;
    await base44.entities.Job.update(jobId, { property_id: propertyId });
    await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
  };

  const formatAddress = (p) =>
    [p.address_line_1, p.city, p.state, p.postal_code].filter(Boolean).join(', ');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Missing company');
      if (!form.address_line_1.trim()) throw new Error('Street address is required.');
      if (!form.city.trim()) throw new Error('City is required.');
      if (!form.state.trim()) throw new Error('State is required.');
      return base44.entities.Property.create({
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
      {/* Selected badge */}
      {value?.id && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div>
            <p className="text-sm font-semibold">{value.address_line_1}</p>
            <p className="text-xs text-muted-foreground">{formatAddress(value)}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setMode('select'); setError(''); }}
          className={`${btnBase} ${mode === 'select' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
        >
          Select Existing
        </button>
        <button
          type="button"
          onClick={() => { setMode('create'); setError(''); }}
          className={`inline-flex items-center gap-1.5 ${btnBase} ${mode === 'create' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
        >
          <Plus size={14} /> New Property
        </button>
      </div>

      {/* Select mode */}
      {mode === 'select' && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address, city, or state..."
            />
          </div>

          {propertyQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          )}

          {!propertyQuery.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground p-3 border border-border rounded-lg">
              No property records found. Use New Property to create one.
            </p>
          )}

          {filtered.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border border-border divide-y divide-border">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProperty(p)}
                  className={`w-full text-left p-3 transition hover:bg-muted ${value?.id === p.id ? 'bg-primary/10' : ''}`}
                >
                  <p className="text-sm font-medium">{p.address_line_1}</p>
                  <p className="text-xs text-muted-foreground">{formatAddress(p)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create mode */}
      {mode === 'create' && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Street Address <span className="text-destructive">*</span></label>
            <input className={inputCls} value={form.address_line_1} onChange={update('address_line_1')} placeholder="123 Main St" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address Line 2</label>
            <input className={inputCls} value={form.address_line_2} onChange={update('address_line_2')} placeholder="Unit, suite, apartment" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">City <span className="text-destructive">*</span></label>
              <input className={inputCls} value={form.city} onChange={update('city')} placeholder="City" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">State <span className="text-destructive">*</span></label>
              <input className={inputCls} value={form.state} onChange={update('state')} placeholder="MO" maxLength={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">ZIP</label>
              <input className={inputCls} value={form.postal_code} onChange={update('postal_code')} placeholder="63139" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Year Built</label>
              <input type="number" className={inputCls} value={form.year_built} onChange={update('year_built')} placeholder="1995" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Property Type</label>
            <input className={inputCls} value={form.property_type} onChange={update('property_type')} placeholder="Residential, commercial..." />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <Save size={14} />
            {createMutation.isPending ? 'Saving...' : 'Save Property'}
          </button>
        </div>
      )}
    </div>
  );
}