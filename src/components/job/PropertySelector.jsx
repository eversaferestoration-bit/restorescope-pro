import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Check, Home } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function PropertySelector({ value, onChange }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const queryClient = useQueryClient();

  const [localCompanyId, setLocalCompanyId] = useState(
    userProfile?.company_id || user?.company_id || ''
  );

  const companyId =
    userProfile?.company_id || user?.company_id || localCompanyId || '';

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const [newForm, setNewForm] = useState({
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip: '',
    property_type: 'Residential',
  });

  const ensureCompanyId = async () => {
    let cId = userProfile?.company_id || user?.company_id || localCompanyId || '';

    if (cId) return cId;

    const email = user?.email || '';

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
    data: properties = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['properties', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      return await base44.entities.Property.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        'address_line_1',
        100
      );
    },
    staleTime: 30 * 1000,
  });

  const selected = useMemo(() => {
    if (!value) return null;
    return properties.find((property) => property.id === value.id) || value;
  }, [properties, value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return properties;

    return properties.filter((property) => {
      const address = String(property.address_line_1 || '').toLowerCase();
      const city = String(property.city || '').toLowerCase();
      const state = String(property.state || '').toLowerCase();
      const zip = String(property.zip || '').toLowerCase();

      return (
        address.includes(term) ||
        city.includes(term) ||
        state.includes(term) ||
        zip.includes(term)
      );
    });
  }, [properties, search]);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await base44.entities.Property.create(payload);
    },
    onSuccess: async (created) => {
      onChange(created);
      setAdding(false);
      setSearch('');
      setError('');

      setNewForm({
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip: '',
        property_type: 'Residential',
      });

      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      await refetch();
    },
    onError: (err) => {
      console.error('[PropertySelector] Failed to create property:', err);
      setError('Could not save property. Check Property entity permissions.');
    },
  });

  const handleCreate = async () => {
    setError('');

    const address = newForm.address_line_1.trim();

    if (!address) {
      setError('Street address is required.');
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
        address_line_1: address,
        address_line_2: newForm.address_line_2.trim(),
        city: newForm.city.trim(),
        state: newForm.state.trim(),
        zip: newForm.zip.trim(),
        property_type: newForm.property_type || 'Residential',
        is_deleted: false,
        created_by: user?.email || '',
      });
    } catch (err) {
      console.error('[PropertySelector] Company auto-link failed:', err);
      setError(
        'Could not create or link company profile. Check Company and UserProfile permissions.'
      );
    }
  };

  const formatAddress = (property) => {
    return [
      property?.address_line_1,
      property?.address_line_2,
      property?.city,
      property?.state,
      property?.zip,
    ]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="space-y-2">
      {selected && (
        <div className="flex items-center justify-between bg-accent rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-primary" />
            <div>
              <p className="text-sm font-medium">
                {selected.address_line_1 || 'Selected Property'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatAddress(selected)}
              </p>
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
              placeholder="Search property…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {!adding && (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {isLoading && (
                <p className="text-xs text-muted-foreground px-3 py-2">
                  Loading properties…
                </p>
              )}

              {!isLoading &&
                filtered.map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => {
                      onChange(property);
                      setSearch('');
                      setError('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted text-left transition border-b border-border last:border-0"
                  >
                    <Home size={14} className="text-muted-foreground shrink-0" />

                    <div>
                      <p className="text-sm font-medium">
                        {property.address_line_1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAddress(property)}
                      </p>
                    </div>
                  </button>
                ))}

              {!isLoading && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">
                  No properties found.
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
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
          >
            <Plus size={13} />
            {adding ? 'Cancel new property' : 'Add new property'}
          </button>

          {adding && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border">
              <p className="text-xs font-semibold">New Property</p>

              <input
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Street address *"
                value={newForm.address_line_1}
                onChange={(event) =>
                  setNewForm((current) => ({
                    ...current,
                    address_line_1: event.target.value,
                  }))
                }
              />

              <input
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Apt, suite, unit"
                value={newForm.address_line_2}
                onChange={(event) =>
                  setNewForm((current) => ({
                    ...current,
                    address_line_2: event.target.value,
                  }))
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="City"
                  value={newForm.city}
                  onChange={(event) =>
                    setNewForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />

                <input
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="State"
                  value={newForm.state}
                  onChange={(event) =>
                    setNewForm((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="ZIP"
                  value={newForm.zip}
                  onChange={(event) =>
                    setNewForm((current) => ({
                      ...current,
                      zip: event.target.value,
                    }))
                  }
                />

                <select
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={newForm.property_type}
                  onChange={(event) =>
                    setNewForm((current) => ({
                      ...current,
                      property_type: event.target.value,
                    }))
                  }
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Multi-Family">Multi-Family</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>

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
                  disabled={!newForm.address_line_1.trim() || createMutation.isPending}
                  onClick={handleCreate}
                  className="text-xs px-3 h-8 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Saving…' : 'Save Property'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}