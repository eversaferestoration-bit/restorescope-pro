import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Save, X } from 'lucide-react';

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

export default function PropertySelector({ value, onChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState('select');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const companyId = user?.company_id || null;

  const propertyQuery = useQuery({
    queryKey: ['properties', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      return await base44.entities.Property.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        'address_line_1',
        200
      );
    },
  });

  const properties = Array.isArray(propertyQuery.data) ? propertyQuery.data : [];

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return properties;

    return properties.filter((property) => {
      const haystack = [
        property.address_line_1,
        property.address_line_2,
        property.city,
        property.state,
        property.postal_code,
        property.property_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [properties, search]);

  const createMutation = useMutation({
    mutationFn: async () => {
      setError('');

      if (!companyId) {
        throw new Error('Your account is not linked to a company.');
      }

      if (!form.address_line_1.trim()) {
        throw new Error('Street address is required.');
      }

      if (!form.city.trim()) {
        throw new Error('City is required.');
      }

      if (!form.state.trim()) {
        throw new Error('State is required.');
      }

      const payload = {
        address_line_1: form.address_line_1.trim(),
        address_line_2: form.address_line_2.trim() || null,
        city: form.city.trim(),
        state: form.state.trim(),
        postal_code: form.postal_code.trim() || null,
        property_type: form.property_type.trim() || null,
        year_built: form.year_built ? Number(form.year_built) : null,
        company_id: companyId,
        is_deleted: false,
      };

      return await base44.entities.Property.create(payload);
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['properties', companyId] });
      onChange(created);
      setForm(emptyForm);
      setSearch('');
      setMode('select');
    },
    onError: (err) => {
      setError(err?.message || 'Failed to save property.');
    },
  });

  const updateForm = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const formatAddress = (property) => {
    return [
      property.address_line_1,
      property.address_line_2,
      property.city,
      property.state,
      property.postal_code,
    ]
      .filter(Boolean)
      .join(', ');
  };

  if (!companyId) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Your user profile is missing a company ID. Complete company setup before adding a property.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value?.id && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{value.address_line_1}</p>
              <p className="text-xs text-muted-foreground">{formatAddress(value)}</p>
              {value.property_type && (
                <p className="text-xs text-muted-foreground mt-1">
                  Property type: {value.property_type}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Remove selected property"
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
          <Plus size={15} /> New Property
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
              placeholder="Search property by address, city, state, or ZIP..."
            />
          </div>

          {propertyQuery.isLoading && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Loading property records...
            </div>
          )}

          {propertyQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load property records.
            </div>
          )}

          {!propertyQuery.isLoading && filteredProperties.length === 0 && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              No property records found. Use New Property to create one.
            </div>
          )}

          {filteredProperties.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-border divide-y divide-border">
              {filteredProperties.map((property) => {
                const selected = value?.id === property.id;

                return (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => onChange(property)}
                    className={`w-full text-left p-3 transition ${
                      selected ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <p className="text-sm font-medium">{property.address_line_1}</p>
                    <p className="text-xs text-muted-foreground">{formatAddress(property)}</p>
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
              Street Address <span className="text-destructive">*</span>
            </label>
            <input
              className={inputCls}
              value={form.address_line_1}
              onChange={updateForm('address_line_1')}
              placeholder="123 Main Street"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Address Line 2</label>
            <input
              className={inputCls}
              value={form.address_line_2}
              onChange={updateForm('address_line_2')}
              placeholder="Unit, suite, apartment"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                City <span className="text-destructive">*</span>
              </label>
              <input
                className={inputCls}
                value={form.city}
                onChange={updateForm('city')}
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                State <span className="text-destructive">*</span>
              </label>
              <input
                className={inputCls}
                value={form.state}
                onChange={updateForm('state')}
                placeholder="MO"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">ZIP</label>
              <input
                className={inputCls}
                value={form.postal_code}
                onChange={updateForm('postal_code')}
                placeholder="63139"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Property Type</label>
              <input
                className={inputCls}
                value={form.property_type}
                onChange={updateForm('property_type')}
                placeholder="Residential, commercial, multi-family..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Year Built</label>
              <input
                type="number"
                className={inputCls}
                value={form.year_built}
                onChange={updateForm('year_built')}
                placeholder="1995"
              />
            </div>
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
            {createMutation.isPending ? 'Saving...' : 'Save Property'}
          </button>
        </div>
      )}
    </div>
  );
}