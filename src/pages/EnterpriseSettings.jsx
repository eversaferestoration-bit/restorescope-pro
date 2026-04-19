import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Users, DollarSign, BarChart3, MapPin, Plus, Trash2, Save, Building, Activity } from 'lucide-react';
import SystemStatusDashboard from '@/components/admin/SystemStatusDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function EnterpriseSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('locations');
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    manager_id: '',
    timezone: 'America/Chicago',
  });

  // Load enterprise settings
  const { data: enterpriseSettings } = useQuery({
    queryKey: ['enterprise-settings'],
    queryFn: () => base44.entities.EnterpriseSettings.filter({ is_deleted: false }).then(r => r[0]),
  });

  // Load locations
  const { data: locations = [] } = useQuery({
    queryKey: ['company-locations'],
    queryFn: () => base44.entities.CompanyLocation.filter({ is_deleted: false }, 'location_name'),
  });

  // Load pricing profiles
  const { data: pricingProfiles = [] } = useQuery({
    queryKey: ['pricing-profiles'],
    queryFn: () => base44.entities.PricingProfile.filter({ is_deleted: false }),
  });

  // Load users for manager selection
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.filter({ is_deleted: false }),
  });

  // Load usage report
  const { data: usageReport } = useQuery({
    queryKey: ['usage-report'],
    queryFn: () => base44.functions.invoke('getUsageReport', { period: 'monthly', days: 30 }),
  });

  // Mutations
  const createLocationMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanyLocation.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['company-locations']);
      setAddingLocation(false);
      setLocationForm({
        location_name: '',
        location_code: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        manager_id: '',
        timezone: 'America/Chicago',
      });
      toast.success('Location added successfully');
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id) => base44.entities.CompanyLocation.update(id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries(['company-locations']);
      toast.success('Location deleted');
    },
  });

  const updateEnterpriseSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (enterpriseSettings?.id) {
        return base44.entities.EnterpriseSettings.update(enterpriseSettings.id, data);
      }
      return base44.entities.EnterpriseSettings.create({ company_id: 'default', ...data });
    },
    onSuccess: () => {
      qc.invalidateQueries(['enterprise-settings']);
      toast.success('Enterprise settings updated');
    },
  });

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    createLocationMutation.mutate({
      company_id: 'default',
      name: locationForm.name,
      code: locationForm.code,
      address: locationForm.address,
      city: locationForm.city,
      state: locationForm.state,
      zip: locationForm.zip,
      phone: locationForm.phone,
      manager_id: locationForm.manager_id,
      timezone: locationForm.timezone,
      is_headquarters: locations.length === 0,
      is_active: true,
    });
  };

  const toggleSetting = (key) => {
    updateEnterpriseSettingsMutation.mutate({
      [key]: !enterpriseSettings?.[key],
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold">Admin access required</p>
            <p className="text-sm text-muted-foreground mt-1">Enterprise settings are only available to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Building2 size={24} className="text-primary" />
          Enterprise Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-location management, hierarchy, and reporting</p>
      </div>

      {/* System Status */}
      <SystemStatusDashboard />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'status', label: 'System Status', icon: Activity },
          { key: 'locations', label: 'Locations', icon: MapPin },
          { key: 'hierarchy', label: 'Admin Hierarchy', icon: Users },
          { key: 'pricing', label: 'Branch Pricing', icon: DollarSign },
          { key: 'usage', label: 'Usage Reports', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* System Status Tab */}
      {activeTab === 'status' && (
        <div className="py-4">
          <SystemStatusDashboard />
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Company Locations</h2>
            <Button onClick={() => setAddingLocation(!addingLocation)} size="sm">
              <Plus size={14} className="mr-1" /> Add Location
            </Button>
          </div>

          {addingLocation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">New Location</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLocationSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Location Name *</Label>
                      <Input
                        required
                        className={inputCls}
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                        placeholder="e.g. Downtown Branch"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Location Code *</Label>
                      <Input
                        required
                        className={inputCls}
                        value={locationForm.code}
                        onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                        placeholder="e.g. DT-01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Address</Label>
                      <Input
                        className={inputCls}
                        value={locationForm.address}
                        onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        className={inputCls}
                        value={locationForm.city}
                        onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <Input
                        className={inputCls}
                        value={locationForm.state}
                        onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP</Label>
                      <Input
                        className={inputCls}
                        value={locationForm.zip}
                        onChange={(e) => setLocationForm({ ...locationForm, zip: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        className={inputCls}
                        value={locationForm.phone}
                        onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Manager</Label>
                      <Select
                        value={locationForm.manager_id}
                        onValueChange={(value) => setLocationForm({ ...locationForm, manager_id: value })}
                      >
                        <SelectTrigger className={inputCls}>
                          <SelectValue placeholder="Select manager..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setAddingLocation(false)}>Cancel</Button>
                    <Button type="submit" disabled={createLocationMutation.isPending}>
                      <Save size={14} className="mr-1" />
                      {createLocationMutation.isPending ? 'Adding...' : 'Add Location'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Locations List */}
          <div className="grid gap-3">
            {locations.map(loc => (
              <Card key={loc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{loc.name}</h3>
                        <Badge variant="outline">{loc.code}</Badge>
                        {loc.is_headquarters && (
                          <Badge className="bg-primary/10 text-primary">Headquarters</Badge>
                        )}
                        {!loc.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}
                      </div>
                      {loc.manager_id && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Manager: {users.find(u => u.id === loc.manager_id)?.full_name || 'Unknown'}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLocationMutation.mutate(loc.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Admin Hierarchy Tab */}
      {activeTab === 'hierarchy' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Admin Hierarchy Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Multi-Location</p>
                <p className="text-xs text-muted-foreground">Allow multiple branch locations</p>
              </div>
              <Switch
                checked={enterpriseSettings?.enable_multi_location || false}
                onCheckedChange={() => toggleSetting('enable_multi_location')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Admin Hierarchy</p>
                <p className="text-xs text-muted-foreground">Corporate and regional admin roles</p>
              </div>
              <Switch
                checked={enterpriseSettings?.enable_admin_hierarchy || false}
                onCheckedChange={() => toggleSetting('enable_admin_hierarchy')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Branch Pricing</p>
                <p className="text-xs text-muted-foreground">Custom pricing per location</p>
              </div>
              <Switch
                checked={enterpriseSettings?.enable_branch_pricing || false}
                onCheckedChange={() => toggleSetting('enable_branch_pricing')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Usage Reporting</p>
                <p className="text-xs text-muted-foreground">Track and report usage metrics</p>
              </div>
              <Switch
                checked={enterpriseSettings?.enable_usage_reporting !== false}
                onCheckedChange={() => toggleSetting('enable_usage_reporting')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Branch-Specific Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add locations first to configure branch pricing.</p>
              ) : (
                <div className="space-y-3">
                  {locations.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{loc.name}</p>
                        <p className="text-xs text-muted-foreground">{loc.code}</p>
                      </div>
                      <Select
                        value={loc.pricing_profile_id || 'default'}
                        onValueChange={(value) => {
                          base44.functions.invoke('setLocationPricing', {
                            location_id: loc.id,
                            pricing_profile_id: value,
                          }).then(() => {
                            qc.invalidateQueries(['company-locations']);
                            toast.success('Pricing updated');
                          });
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select pricing..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default Pricing</SelectItem>
                          {pricingProfiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Reports Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          {usageReport?.data ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Jobs', value: usageReport.data.metrics.total_jobs, icon: Building },
                  { label: 'Estimates', value: usageReport.data.metrics.total_estimates, icon: DollarSign },
                  { label: 'Users', value: usageReport.data.metrics.total_users, icon: Users },
                  { label: 'Photos', value: usageReport.data.metrics.total_photos, icon: MapPin },
                ].map(stat => (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <stat.icon size={20} className="text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Top Users (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {usageReport.data.top_users.slice(0, 5).map((u, idx) => (
                      <div key={u.user_id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.user_name}</p>
                            <p className="text-xs text-muted-foreground">{u.jobs_count} jobs · {u.estimates_count} estimates</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Estimate Value</p>
                    <p className="text-xl font-bold">${usageReport.data.metrics.total_estimate_value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Estimate Value</p>
                    <p className="text-xl font-bold">${usageReport.data.metrics.avg_estimate_value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Storage Used</p>
                    <p className="text-xl font-bold">{usageReport.data.metrics.storage_mb} MB</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">AI Analyses</p>
                    <p className="text-xl font-bold">{usageReport.data.metrics.ai_analyses}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Loading usage data...</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}