import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Save, X } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  mailing_address: '',
};

export default function InsuredSelector({ value, onChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState('select');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const companyId = user?.company_id || null;

  const insuredQuery = useQuery({
    queryKey: ['insureds', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      return await base44.entities.Insured.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        'full_name',
        200
      );
    },
  });

  const insureds = Array.isArray(insuredQuery.data) ? insuredQuery.data : [];

  const filteredInsureds = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return insureds;

    return insureds.filter((insured) => {
      const haystack = [
        insured.full_name,
        insured.name,
        insured.phone,
        insured.email,
        insured.mailing_address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [insureds, search]);

  const createMutation = useMutation({
    mutationFn: async () => {
      setError('');

      if (!companyId) {
        throw new Error('Your account is not linked to a company.');
      }

      if (!form.full_name.trim()) {
        throw new Error('Insured name is required.');
      }

      const payload = {
        full_name: form.full_name.trim(),
        name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        mailing_address: form.mailing_address.trim() || null,
        company_id: companyId,
        is_deleted: false,
      };

      return await base44.entities.Insured.create(payload);
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['insureds', companyId] });
      onChange(created);
      setForm(emptyForm);
      setSearch('');
      setMode('select');
    },
    onError: (err) => {
      setError(err?.message || 'Failed to save insured.');
    },
  });

  const updateForm = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  if (!companyId) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Your user profile is missing a company ID. Complete company setup before adding an insured.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value?.id && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{value.full_name || value.name}</p>
              <p className="text-xs text-muted-foreground">
                {[value.phone, value.email].filter(Boolean).join(' • ') || 'No contact information'}
              </p>
              {value.mailing_address && (
                <p className="text-xs text-muted-foreground mt-1">{value.mailing_address}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Remove selected insured"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('select');
            setError('');
          }}
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
          onClick={() => {
            setMode('create');
            setError('');
          }}
          className={`inline-flex items-center gap-1.5 min-h-touch px-3 rounded-lg border text-sm font-medium transition ${
            mode === 'create'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:bg-muted'
          }`}
        >
          <Plus size={15} /> New Insured
        </button>
      </div>

      {mode === 'select' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputCls} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search insured by name, phone, or email..."
            />
          </div>

          {insuredQuery.isLoading && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Loading insured records...
            </div>
          )}

          {insuredQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load insured records.
            </div>
          )}

          {!insuredQuery.isLoading && filteredInsureds.length === 0 && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              No insured records found. Use New Insured to create one.
            </div>
          )}

          {filteredInsureds.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-border divide-y divide-border">
              {filteredInsureds.map((insured) => {
                const selected = value?.id === insured.id;

                return (
                  <button
                    key={insured.id}
                    type="button"
                    onClick={() => onChange(insured)}
                    className={`w-full text-left p-3 transition ${
                      selected ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <p className="text-sm font-medium">{insured.full_name || insured.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[insured.phone, insured.email].filter(Boolean).join(' • ') || 'No contact information'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'create' && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={updateForm('full_name')}
              placeholder="Property owner or insured name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input
                className={inputCls}
                value={form.phone}
                onChange={updateForm('phone')}
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                className={inputCls}
                value={form.email}
                onChange={updateForm('email')}
                placeholder="Email address"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Mailing Address</label>
            <input
              className={inputCls}
              value={form.mailing_address}
              onChange={updateForm('mailing_address')}
              placeholder="Mailing address"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <Save size={15} />
            {createMutation.isPending ? 'Saving...' : 'Save Insured'}
          </button>
        </div>
      )}
    </div>
  );
}