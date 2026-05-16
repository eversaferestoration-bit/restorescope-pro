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
  full_name: '',
  phone: '',
  email: '',
  mailing_address: '',
};

export default function InsuredSelector({ value, onChange, jobId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companyId = user?.company_id;

  const [mode, setMode] = useState('select');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const insuredQuery = useQuery({
    queryKey: ['insureds', companyId],
    enabled: !!companyId,
    queryFn: async () =>
      base44.entities.Insured.filter({ company_id: companyId, is_deleted: false }),
    staleTime: 5 * 60 * 1000,
  });

  const insureds = insuredQuery.data || [];

  const filtered = useMemo(() => {
    if (!search) return insureds;
    const term = search.toLowerCase();
    return insureds.filter((i) =>
      [i.full_name, i.phone, i.email].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [insureds, search]);

  const linkToJob = async (insuredId) => {
    if (!jobId) return;
    await base44.entities.Job.update(jobId, { insured_id: insuredId });
    await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error('Name required');
      return base44.entities.Insured.create({ ...form, company_id: companyId, is_deleted: false });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['insureds', companyId] });
      await linkToJob(created.id);
      onChange(created);
      setForm(emptyForm);
      setMode('select');
    },
    onError: (err) => setError(err.message),
  });

  const selectInsured = async (insured) => {
    await linkToJob(insured.id);
    onChange(insured);
  };

  const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-3">
      {/* Selected badge */}
      {value?.id && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div>
            <p className="text-sm font-semibold">{value.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {[value.phone, value.email].filter(Boolean).join(' • ') || 'No contact info'}
            </p>
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
          <Plus size={14} /> New Insured
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
              placeholder="Search by name, phone, or email..."
            />
          </div>

          {insuredQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          )}

          {!insuredQuery.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground p-3 border border-border rounded-lg">
              No insured records found. Use New Insured to create one.
            </p>
          )}

          {filtered.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border border-border divide-y divide-border">
              {filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => selectInsured(i)}
                  className={`w-full text-left p-3 transition hover:bg-muted ${value?.id === i.id ? 'bg-primary/10' : ''}`}
                >
                  <p className="text-sm font-medium">{i.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[i.phone, i.email].filter(Boolean).join(' • ') || 'No contact info'}
                  </p>
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
            <label className="block text-sm font-medium mb-1.5">Full Name <span className="text-destructive">*</span></label>
            <input className={inputCls} value={form.full_name} onChange={update('full_name')} placeholder="Property owner or insured name" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input className={inputCls} value={form.phone} onChange={update('phone')} placeholder="Phone number" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input className={inputCls} value={form.email} onChange={update('email')} placeholder="Email address" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Mailing Address</label>
            <input className={inputCls} value={form.mailing_address} onChange={update('mailing_address')} placeholder="Mailing address" />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <Save size={14} />
            {createMutation.isPending ? 'Saving...' : 'Save Insured'}
          </button>
        </div>
      )}
    </div>
  );
}