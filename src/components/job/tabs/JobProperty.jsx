import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit, RefreshCw, Save, X } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

const emptyProperty = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  property_type: '',
  year_built: '',
  square_feet: '',
  stories: '',
  construction_type: '',
  occupancy_status: '',
  notes: '',
};

function normalizeProperty(property) {
  if (!property) return emptyProperty;

  return {
    address_line_1: property.address_line_1 || '',
    address_line_2: property.address_line_2 || '',
    city: property.city || '',
    state: property.state || '',
    postal_code: property.postal_code || '',
    property_type: property.property_type || '',
    year_built: property.year_built || '',
    square_feet: property.square_feet || '',
    stories: property.stories || '',
    construction_type: property.construction_type || '',
    occupancy_status: property.occupancy_status || '',
    notes: property.notes || '',
  };
}

export default function JobProperty({ job }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companyId = user?.company_id || job?.company_id || null;
  const propertyId = job?.property_id || null;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyProperty);
  const [error, setError] = useState('');

  const propertyQuery = useQuery({
    queryKey: ['job-property', propertyId, companyId],
    enabled: !!propertyId && !!companyId,
    queryFn: async () => {
      const records = await base44.entities.Property.filter(
        {
          id: propertyId,
          company_id: companyId,
          is_deleted: false,
        },
        '-created_date',
        1
      );

      return Array.isArray(records) && records.length > 0 ? records[0] : null;
    },
  });

  const property = propertyQuery.data || null;

  useEffect(() => {
    if (property) {
      setForm(normalizeProperty(property));
    } else {
      setForm(emptyProperty);
    }
  }, [property]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setError('');

      if (!companyId) {
        throw new Error('Missing company ID.');
      }

      if (!propertyId) {
        throw new Error('No property is linked to this job.');
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
        square_feet: form.square_feet ? Number(form.square_feet) : null,
        stories: form.stories ? Number(form.stories) : null,
        construction_type: form.construction_type.trim() || null,
        occupancy_status: form.occupancy_status.trim() || null,
        notes: form.notes.trim() || null,
        company_id: companyId,
        is_deleted: false,
      };

      return await base44.entities.Property.update(propertyId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-property', propertyId, companyId] });
      await queryClient.invalidateQueries({ queryKey: ['properties', companyId] });
      setEditing(false);
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

  const fullAddress = property
    ? [
        property.address_line_1,
        property.address_line_2,
        property.city,
        property.state,
        property.postal_code,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  if (!job?.id) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground">
        Job could not be loaded.
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="bg-card rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        This job or user is missing a company ID. Property details cannot load securely.
      </div>
    );
  }

  if (!propertyId) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-semibold mb-1">No property linked</h3>
        <p className="text-sm text-muted-foreground">
          This job does not have a property linked yet. Link a property from the job setup or edit screen.
        </p>
      </div>
    );
  }

  if (propertyQuery.isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (propertyQuery.isError) {
    return (
      <div className="bg-card rounded-xl border border-destructive/30 bg-destructive/10 p-6">
        <p className="text-sm text-destructive mb-3">Property could not be loaded.</p>
        <button
          type="button"
          onClick={() => propertyQuery.refetch()}
          className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition"
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-semibold mb-1">Property not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The linked property could not be found for this company. It may have been deleted or saved under a different company.
        </p>
        <button
          type="button"
          onClick={() => propertyQuery.refetch()}
          className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold font-display">Edit Property</h2>
            <p className="text-sm text-muted-foreground">Update the property linked to this job.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm(normalizeProperty(property));
              setEditing(false);
              setError('');
            }}
            className="inline-flex items-center gap-2 min-h-touch px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
          >
            <X size={15} /> Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5">
              Street Address <span className="text-destructive">*</span>
            </label>
            <input
              className={inputCls}
              value={form.address_line_1}
              onChange={updateForm('address_line_1')}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Address Line 2</label>
            <input
              className={inputCls}
              value={form.address_line_2}
              onChange={updateForm('address_line_2')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              City <span className="text-destructive">*</span>
            </label>
            <input className={inputCls} value={form.city} onChange={updateForm('city')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              State <span className="text-destructive">*</span>
            </label>
            <input className={inputCls} value={form.state} onChange={updateForm('state')} maxLength={2} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">ZIP</label>
            <input className={inputCls} value={form.postal_code} onChange={updateForm('postal_code')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Property Type</label>
            <input className={inputCls} value={form.property_type} onChange={updateForm('property_type')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Year Built</label>
            <input type="number" className={inputCls} value={form.year_built} onChange={updateForm('year_built')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Square Feet</label>
            <input type="number" className={inputCls} value={form.square_feet} onChange={updateForm('square_feet')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Stories</label>
            <input type="number" className={inputCls} value={form.stories} onChange={updateForm('stories')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Construction Type</label>
            <input className={inputCls} value={form.construction_type} onChange={updateForm('construction_type')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Occupancy Status</label>
            <input className={inputCls} value={form.occupancy_status} onChange={updateForm('occupancy_status')} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              className="w-full min-h-24 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              value={form.notes}
              onChange={updateForm('notes')}
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
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
        >
          <Save size={15} />
          {saveMutation.isPending ? 'Saving...' : 'Save Property'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold font-display flex items-center gap-2">
            <Building2 size={18} /> Property
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{fullAddress}</p>
        </div>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 min-h-touch px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
        >
          <Edit size={15} /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Street Address" value={property.address_line_1} />
        <Info label="Address Line 2" value={property.address_line_2} />
        <Info label="City" value={property.city} />
        <Info label="State" value={property.state} />
        <Info label="ZIP" value={property.postal_code} />
        <Info label="Property Type" value={property.property_type} />
        <Info label="Year Built" value={property.year_built} />
        <Info label="Square Feet" value={property.square_feet} />
        <Info label="Stories" value={property.stories} />
        <Info label="Construction Type" value={property.construction_type} />
        <Info label="Occupancy Status" value={property.occupancy_status} />
        <div className="md:col-span-2">
          <Info label="Notes" value={property.notes} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium whitespace-pre-wrap">{value || '—'}</p>
    </div>
  );
}