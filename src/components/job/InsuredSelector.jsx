import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Save, X, User } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  mailing_address: '',
};

export default function InsuredSelector({ value, onChange, jobId, companyId: companyIdProp }) {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();

  // Accept companyId as prop (from NewJob which resolves it), or fall back to userProfile
  const companyId = companyIdProp || userProfile?.company_id;

  const [mode, setMode] = useState('select');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const insuredQuery = useQuery({
    queryKey: ['insureds', companyId],
    enabled: !!companyId,
    queryFn: () =>
      base44.entities.Insured.filter({ company_id: companyId, is_deleted: false }),
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
      return await base44.entities.Insured.create({
        ...form,
        company_id: companyId,
        is_deleted: false,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['insureds', companyId] });
      await linkToJob(created.id);
      onChange(created);
      setForm(emptyForm);
      setMode('select');
      setError('');
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
      {value && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{value.full_name || value.name}</p>
            <p className="text-xs text-muted-foreground">
              {[value.phone, value.email].filter(Boolean).join(' • ') || 'No contact info'}
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
          <Plus size={14} /> New Insured
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
              placeholder="Search by name, phone, or email..."
            />
          </div>

          {insuredQuery.isLoading && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Loading...</div>
          )}

          {!insuredQuery.isLoading && filtered.length === 0 && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              No insured records found. Use New Insured to create one.
            </div>
          )}

          {filtered.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border border-border divide-y divide-border">
              {filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => selectInsured(i)}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2.5 transition hover:bg-muted ${
                    value?.id === i.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <User size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{i.full_name}</p>
                    {i.email && <p className="text-xs text-muted-foreground">{i.email}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'create' && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs font-semibold">New Insured</p>
          <input className={inputCls} value={form.full_name} onChange={update('full_name')} placeholder="Full name *" />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} value={form.phone} onChange={update('phone')} placeholder="Phone" />
            <input className={inputCls} value={form.email} onChange={update('email')} placeholder="Email" />
          </div>
          <input className={inputCls} value={form.mailing_address} onChange={update('mailing_address')} placeholder="Mailing address" />

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
              <Save size={13} /> {createMutation.isPending ? 'Saving...' : 'Save Insured'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}