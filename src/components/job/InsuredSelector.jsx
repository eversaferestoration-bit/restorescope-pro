import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Check, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function InsuredSelector({ value, onChange }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const queryClient = useQueryClient();

  const [localCompanyId, setLocalCompanyId] = useState(userProfile?.company_id || user?.company_id || '');
  const companyId = userProfile?.company_id || user?.company_id || localCompanyId || '';

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [newForm, setNewForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const ensureCompanyId = async () => {
    let cId = userProfile?.company_id || user?.company_id || localCompanyId || '';

    if (cId) return cId;

    const email = user?.email || newForm.email || '';

    const existingCompanies = await base44.entities.Company.filter({
      created_by: email,
      is_deleted: false,
    });

    if (existingCompanies?.length > 0) {
      cId = existingCompanies[0].id;
      setLocalCompanyId(cId);

      if (userProfile?.id) {
        await base44.entities.UserProfile.update(userProfile.id, {
          company_id: cId,
          email,
          is_deleted: false,
        });
      }

      if (refreshUserProfile) await refreshUserProfile();

      return cId;
    }

    const company = await base44.entities.Company.create({
      name: 'Eversafe Restoration',
      phone: '636-219-9302',
      email,
      website: 'https://eversafepro.com',
      city: 'St. Louis',
      state: 'MO',
      service_area: 'St. Louis, MO and surrounding areas; Alton, IL and surrounding areas',
      status: 'active',
      created_by: email,
      is_deleted: false,
    });

    cId = company.id;
    setLocalCompanyId(cId);

    if (userProfile?.id) {
      await base44.entities.UserProfile.update(userProfile.id, {
        company_id: cId,
        email,
        is_deleted: false,
      });
    }

    if (refreshUserProfile) await refreshUserProfile();

    return cId;
  };

  const {
    data: insureds = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['insureds', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      return await base44.entities.Insured.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        'full_name',
        100
      );
    },
    staleTime: 30 * 1000,
  });

  const selected = useMemo(() => {
    if (!value) return null;
    return insureds.find((insured) => insured.id === value.id) || value;
  }, [insureds, value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return insureds;

    return insureds.filter((insured) => {
      const name = String(insured.full_name || '').toLowerCase();
      const email = String(insured.email || '').toLowerCase();
      const phone = String(insured.phone || '').toLowerCase();

      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [insureds, search]);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await base44.entities.Insured.create(payload);
    },
    onSuccess: async (created) => {
      onChange(created);
      setAdding(false);
      setSearch('');
      setError('');
      setNewForm({
        full_name: '',
        email: '',
        phone: '',
      });

      await queryClient.invalidateQueries({ queryKey: ['insureds'] });
      await refetch();
    },
    onError: (err) => {
      console.error('[InsuredSelector] Failed to create insured:', err);
      setError('Could not save insured. Check Insured entity permissions.');
    },
  });

  const handleCreate = async () => {
    setError('');

    const fullName = newForm.full_name.trim();
    const email = newForm.email.trim().toLowerCase();
    const phone = newForm.phone.trim();

    if (!fullName) {
      setError('Full name is required.');
      return;
    }

    try {
      const cId = await ensureCompanyId();

      if (!cId) {
        setError('Could not create or link company profile.');
        return;
      }

      createMutation.mutate({
        company_id: cId,
        full_name: fullName,
        email,
        phone,
        is_deleted: false,
        created_by: user?.email || email,
      });
    } catch (err) {
      console.error('[InsuredSelector] Company auto-link failed:', err);
      setError('Could not create or link company profile. Check Company and UserProfile permissions.');
    }
  };

  return (
    <div className="space-y-2">
      {selected && (
        <div className="flex items-center justify-between bg-accent rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-primary" />
            <div>
              <p className="text-sm font-medium">{selected.full_name}</p>
              {selected.email && <p className="text-xs text-muted-foreground">{selected.email}</p>}
              {selected.phone && <p className="text-xs text-muted-foreground">{selected.phone}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground hover:text-destructive transition"
          >
            Remove
          </button>
        </div>
      )}

      {!selected && (
        <>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search insured…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {!adding && (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {isLoading && (
                <p className="text-xs text-muted-foreground px-3 py-2">
                  Loading insureds…
                </p>
              )}

              {!isLoading &&
                filtered.map((insured) => (
                  <button
                    key={insured.id}
                    type="button"
                    onClick={() => {
                      onChange(insured);
                      setSearch('');
                      setError('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted text-left transition border-b border-border last:border-0"
                  >
                    <User size={14} className="text-muted-foreground shrink-0" />

                    <div>
                      <p className="text-sm font-medium">{insured.full_name}</p>
                      {insured.email && (
                        <p className="text-xs text-muted-foreground">{insured.email}</p>
                      )}
                      {insured.phone && (
                        <p className="text-xs text-muted-foreground">{insured.phone}</p>
                      )}
                    </div>
                  </button>
                ))}

              {!isLoading && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">
                  No insureds found.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setAdding((current) => !current);
              setError('');
            }}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <Plus size={13} />
            {adding ? 'Cancel new insured' : 'Add new insured'}
          </button>

          {adding && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border">
              <p className="text-xs font-semibold">New Insured</p>

              <input
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Full name *"
                value={newForm.full_name}
                onChange={(event) =>
                  setNewForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
              />

              <input
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Email"
                value={newForm.email}
                onChange={(event) =>
                  setNewForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />

              <input
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Phone"
                value={newForm.phone}
                onChange={(event) =>
                  setNewForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setError('');
                  }}
                  className="text-xs px-3 h-8 rounded-lg border hover:bg-muted transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!newForm.full_name.trim() || createMutation.isPending}
                  onClick={handleCreate}
                  className="text-xs px-3 h-8 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Saving…' : 'Save Insured'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}