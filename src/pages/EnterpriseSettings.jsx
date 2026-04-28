import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Building2,
  Users,
  DollarSign,
  BarChart3,
  MapPin,
  Plus,
  Trash2,
  Save,
  Activity,
  Shield,
} from 'lucide-react';
import SystemStatusDashboard from '@/components/admin/SystemStatusDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

const emptyLocationForm = {
  location_name: '',
  location_code: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  manager_id: '',
  timezone: 'America/Chicago',
};

const defaultEnterpriseSettings = {
  enable_multi_location: true,
  enable_branch_pricing: false,
  enable_usage_reporting: true,
  enable_admin_hierarchy: true,
  approval_workflow_enabled: false,
  cost_center_enabled: false,
  usage_report_frequency: 'monthly',
};

function unwrapFunctionResponse(response) {
  if (!response) return null;
  if (response.data) return response.data;
  return response;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin' || role === 'platform_admin';
}

export default function EnterpriseSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('status');
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);

  const companyId = user?.company_id || null;
  const isAdmin = isAdminRole(user?.role);

  const enterpriseQuery = useQuery({
    queryKey: ['enterprise-settings', companyId],
    enabled: !!companyId && isAdmin,
    retry: false,
    queryFn: async () => {
      const records = await base44.entities.EnterpriseSettings.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        '-created_date',
        1
      ).catch(() => []);

      return records?.[0] || null;
    },
  });

  const locationsQuery = useQuery({
    queryKey: ['company-locations', companyId],
    enabled: !!companyId && isAdmin,
    retry: false,
    queryFn: async () => {
      return await base44.entities.CompanyLocation.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        'location_name',
        100
      ).catch(() => []);
    },
  });

  const pricingProfilesQuery = useQuery({
    queryKey: ['pricing-profiles', companyId],
    enabled: !!companyId && isAdmin,
    retry: false,
    queryFn: async () => {
      return await base44.entities.PricingProfile.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        'profile_name',
        100
      ).catch(() => []);
    },
  });

  const usersQuery = useQuery({
    queryKey: ['company-users', companyId],
    enabled: !!companyId && isAdmin,
    retry: false,
    queryFn: async () => {
      return await base44.entities.UserProfile.filter(
        {
          company_id: companyId,
          is_deleted: false,
        },
        'full_name',
        200
      ).catch(() => []);
    },
  });

  const usageQuery = useQuery({
    queryKey: ['usage-report', companyId],
    enabled: !!companyId && isAdmin,
    retry: false,
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getUsageReport', {
          period: 'monthly',
          days: 30,
        });

        return unwrapFunctionResponse(response);
      } catch {
        return {
          metrics: {
            total_records: {
              total: 0,
              jobs: 0,
              estimates: 0,
              photos: 0,
            },
          },
          usage: {
            jobs_created: 0,
            estimates_created: 0,
            photos_uploaded: 0,
            active_users: 0,
          },
          totals: {
            jobs: 0,
            estimates: 0,
            photos: 0,
            users: 0,
          },
        };
      }
    },
  });

  const enterpriseSettings = enterpriseQuery.data || null;
  const locations = safeArray(locationsQuery.data);
  const pricingProfiles = safeArray(pricingProfilesQuery.data);
  const users = safeArray(usersQuery.data);
  const usageReport = usageQuery.data || {};

  const updateEnterpriseSettingsMutation = useMutation({
    mutationFn: async (patch) => {
      if (!companyId) throw new Error('Missing company ID.');

      const payload = {
        company_id: companyId,
        is_deleted: false,
        ...defaultEnterpriseSettings,
        ...(enterpriseSettings || {}),
        ...patch,
      };

      if (enterpriseSettings?.id) {
        return await base44.entities.EnterpriseSettings.update(enterpriseSettings.id, payload);
      }

      return await base44.entities.EnterpriseSettings.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['enterprise-settings', companyId] });
      toast.success('Enterprise settings updated');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update enterprise settings');
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Missing company ID.');

      if (!locationForm.location_name.trim()) {
        throw new Error('Location name is required.');
      }

      const payload = {
        company_id: companyId,
        location_name: locationForm.location_name.trim(),
        name: locationForm.location_name.trim(),
        location_code: locationForm.location_code.trim() || null,
        code: locationForm.location_code.trim() || null,
        address: locationForm.address.trim() || null,
        city: locationForm.city.trim() || null,
        state: locationForm.state.trim() || null,
        zip: locationForm.zip.trim() || null,
        phone: locationForm.phone.trim() || null,
        manager_id: locationForm.manager_id || null,
        timezone: locationForm.timezone || 'America/Chicago',
        is_headquarters: locations.length === 0,
        is_active: true,
        is_deleted: false,
      };

      return await base44.entities.CompanyLocation.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-locations', companyId] });
      setAddingLocation(false);
      setLocationForm(emptyLocationForm);
      toast.success('Location added');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add location');
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.CompanyLocation.update(id, {
        is_deleted: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company-locations', companyId] });
      toast.success('Location removed');
    },
    onError: () => {
      toast.error('Failed to remove location');
    },
  });

  const toggleSetting = (key) => {
    updateEnterpriseSettingsMutation.mutate({
      [key]: !(enterpriseSettings?.[key] ?? defaultEnterpriseSettings[key]),
    });
  };

  const updateLocationForm = (key) => (event) => {
    setLocationForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <Shield size={42} className="mx-auto text-destructive mb-3" />
            <p className="text-destructive font-semibold">Admin access required</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enterprise settings are only available to company administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <p className="text-yellow-800 font-semibold">Company setup required</p>
            <p className="text-sm text-yellow-700 mt-1">
              Your user account is not linked to a company. Complete company setup before using enterprise settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalRecords = usageReport?.metrics?.total_records || {};
  const usage = usageReport?.usage || {};
  const totals = usageReport?.totals || {};

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Building2 size={24} className="text-primary" />
          Enterprise Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Company-scoped controls for multi-location operations, reporting, pricing, and beta readiness.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { key: 'status', label: 'System Status', icon: Activity },
          { key: 'locations', label: 'Locations', icon: MapPin },
          { key: 'hierarchy', label: 'Admin Hierarchy', icon: Users },
          { key: 'pricing', label: 'Branch Pricing', icon: DollarSign },
          { key: 'usage', label: 'Usage Reports', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'status' && <SystemStatusDashboard />}

      {activeTab === 'locations' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Company Locations</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Locations are scoped to this company only.
                  </p>
                </div>

                <Button onClick={() => setAddingLocation((current) => !current)} size="sm">
                  <Plus size={14} className="mr-1" />
                  Add Location
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {addingLocation && (
                <div className="rounded-xl border border-border p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Location Name" required>
                      <input
                        className={inputCls}
                        value={locationForm.location_name}
                        onChange={updateLocationForm('location_name')}
                        placeholder="Main Office"
                      />
                    </Field>

                    <Field label="Location Code">
                      <input
                        className={inputCls}
                        value={locationForm.location_code}
                        onChange={updateLocationForm('location_code')}
                        placeholder="STL"
                      />
                    </Field>

                    <Field label="Address">
                      <input
                        className={inputCls}
                        value={locationForm.address}
                        onChange={updateLocationForm('address')}
                        placeholder="Street address"
                      />
                    </Field>

                    <Field label="City">
                      <input
                        className={inputCls}
                        value={locationForm.city}
                        onChange={updateLocationForm('city')}
                        placeholder="St. Louis"
                      />
                    </Field>

                    <Field label="State">
                      <input
                        className={inputCls}
                        value={locationForm.state}
                        onChange={updateLocationForm('state')}
                        placeholder="MO"
                        maxLength={2}
                      />
                    </Field>

                    <Field label="ZIP">
                      <input
                        className={inputCls}
                        value={locationForm.zip}
                        onChange={updateLocationForm('zip')}
                        placeholder="63139"
                      />
                    </Field>

                    <Field label="Phone">
                      <input
                        className={inputCls}
                        value={locationForm.phone}
                        onChange={updateLocationForm('phone')}
                        placeholder="636-219-9302"
                      />
                    </Field>

                    <Field label="Manager">
                      <select
                        className={inputCls}
                        value={locationForm.manager_id}
                        onChange={updateLocationForm('manager_id')}
                      >
                        <option value="">No manager assigned</option>
                        {users.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email || profile.id}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Timezone">
                      <select
                        className={inputCls}
                        value={locationForm.timezone}
                        onChange={updateLocationForm('timezone')}
                      >
                        <option value="America/Chicago">America/Chicago</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Denver">America/Denver</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                      </select>
                    </Field>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddingLocation(false);
                        setLocationForm(emptyLocationForm);
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={() => createLocationMutation.mutate()}
                      disabled={createLocationMutation.isPending}
                    >
                      <Save size={14} className="mr-1" />
                      {createLocationMutation.isPending ? 'Saving...' : 'Save Location'}
                    </Button>
                  </div>
                </div>
              )}

              {locationsQuery.isLoading && (
                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  Loading locations...
                </div>
              )}

              {!locationsQuery.isLoading && locations.length === 0 && (
                <div className="rounded-lg border border-border p-6 text-center">
                  <MapPin size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No locations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a location before assigning branches or regional pricing.
                  </p>
                </div>
              )}

              {locations.length > 0 && (
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="rounded-lg border border-border p-4 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {location.location_name || location.name || 'Unnamed Location'}
                          </p>

                          {location.is_headquarters && (
                            <Badge variant="secondary">Headquarters</Badge>
                          )}

                          {location.location_code || location.code ? (
                            <Badge variant="outline">
                              {location.location_code || location.code}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                          {[location.address, location.city, location.state, location.zip]
                            .filter(Boolean)
                            .join(', ') || 'No address entered'}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {location.phone || 'No phone'} • {location.timezone || 'No timezone'}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => deleteLocationMutation.mutate(location.id)}
                        disabled={deleteLocationMutation.isPending}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'hierarchy' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Hierarchy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Company users and roles. User records are filtered by company ID.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <SettingToggle
              title="Admin hierarchy"
              description="Enable manager/admin role structure for approvals and settings access."
              checked={enterpriseSettings?.enable_admin_hierarchy ?? defaultEnterpriseSettings.enable_admin_hierarchy}
              onChange={() => toggleSetting('enable_admin_hierarchy')}
              disabled={updateEnterpriseSettingsMutation.isPending}
            />

            {users.length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                No company users found.
              </div>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border">
                {users.map((profile) => (
                  <div key={profile.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {profile.full_name || profile.email || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile.email || 'No email'} • {profile.role || 'user'}
                      </p>
                    </div>

                    <Badge variant={isAdminRole(profile.role) ? 'default' : 'secondary'}>
                      {profile.role || 'user'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'pricing' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branch Pricing</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pricing profiles are company-scoped. Use this page to confirm branch pricing is enabled.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <SettingToggle
              title="Branch pricing"
              description="Allow different pricing profiles by location or branch."
              checked={enterpriseSettings?.enable_branch_pricing ?? defaultEnterpriseSettings.enable_branch_pricing}
              onChange={() => toggleSetting('enable_branch_pricing')}
              disabled={updateEnterpriseSettingsMutation.isPending}
            />

            {pricingProfiles.length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center">
                <DollarSign size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No pricing profiles found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pricing profiles can be added from your pricing or estimating module.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border">
                {pricingProfiles.map((profile) => (
                  <div key={profile.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {profile.profile_name || profile.name || 'Pricing Profile'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile.description || 'No description'}
                      </p>
                    </div>

                    <Badge variant={profile.is_active === false ? 'secondary' : 'default'}>
                      {profile.is_active === false ? 'Inactive' : 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'usage' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage Reports</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Usage data comes from the company-scoped getUsageReport function.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <SettingToggle
              title="Usage reporting"
              description="Track jobs, estimates, photos, and active users for billing and beta analytics."
              checked={enterpriseSettings?.enable_usage_reporting ?? defaultEnterpriseSettings.enable_usage_reporting}
              onChange={() => toggleSetting('enable_usage_reporting')}
              disabled={updateEnterpriseSettingsMutation.isPending}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard label="Total Records" value={safeNumber(totalRecords.total)} />
              <MetricCard label="Jobs" value={safeNumber(totalRecords.jobs || totals.jobs || usage.jobs_created)} />
              <MetricCard label="Estimates" value={safeNumber(totalRecords.estimates || totals.estimates || usage.estimates_created)} />
              <MetricCard label="Photos" value={safeNumber(totalRecords.photos || totals.photos || usage.photos_uploaded)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard label="Active Users" value={safeNumber(totals.users || usage.active_users || users.length)} />
              <MetricCard label="Locations" value={locations.length} />
            </div>

            {usageQuery.isLoading && (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                Loading usage report...
              </div>
            )}

            {usageQuery.isError && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                Usage function is unavailable. Safe fallback values are shown.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SettingToggle({ title, description, checked, onChange, disabled }) {
  return (
    <div className="rounded-lg border border-border p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition disabled:opacity-60 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{safeNumber(value).toLocaleString()}</p>
    </div>
  );
}