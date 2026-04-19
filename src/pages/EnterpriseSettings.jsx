import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Users, MapPin, TrendingUp, DollarSign, FileText, Plus, Trash2, Edit, Shield, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function EnterpriseSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('locations');
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  // Check admin access
  if (user?.role !== 'admin') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <Shield size={48} className="mx-auto text-red-600 mb-2" />
          <h2 className="text-lg font-semibold text-red-800">Admin Access Required</h2>
          <p className="text-sm text-red-600 mt-1">Enterprise settings are only available to administrators.</p>
        </div>
      </div>
    );
  }

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['company-locations'],
    queryFn: () => base44.entities.CompanyLocation.filter({ is_deleted: false }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.filter({ is_deleted: false }),
  });

  const { data: usageReport } = useQuery({
    queryKey: ['enterprise-usage'],
    queryFn: () => base44.functions.invoke('getEnterpriseUsageReport', {}),
    staleTime: 5 * 60 * 1000,
  });

  const createLocation = useMutation({
    mutationFn: (data) => base44.entities.CompanyLocation.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['company-locations']);
      setShowLocationForm(false);
    },
  });

  const deleteLocation = useMutation({
    mutationFn: (id) => base44.entities.CompanyLocation.update(id, { is_deleted: true }),
    onSuccess: () => qc.invalidateQueries(['company-locations']),
  });

  const headquarters = locations.find(l => l.is_headquarters);
  const branches = locations.filter(l => !l.is_headquarters);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Enterprise Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Multi-location management and reporting</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'locations' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Locations
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'hierarchy' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Admin Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'pricing' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Branch Pricing
          </button>
          <button
            onClick={() => setActiveTab('reporting')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'reporting' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Usage Reporting
          </button>
        </div>
      </div>

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Company Locations</h2>
            <Button onClick={() => setShowLocationForm(true)} className="gap-2">
              <Plus size={16} /> Add Location
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {headquarters && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 size={16} className="text-primary" />
                      {headquarters.name} (Headquarters)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Code</p>
                        <p className="font-medium">{headquarters.code}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="font-medium">{headquarters.city}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Users</p>
                        <p className="font-medium">{users.filter(u => u.location_id === headquarters.id).length}</p>
                      </div>
                      <div>
                        <Badge variant="outline" className="w-fit">HQ</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {branches.map(branch => (
                <Card key={branch.id} className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-muted-foreground" />
                        {branch.name}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingLocation(branch)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteLocation.mutate(branch.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Code</p>
                        <p className="font-medium">{branch.code}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="font-medium">{branch.city || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Users</p>
                        <p className="font-medium">{users.filter(u => u.location_id === branch.id).length}</p>
                      </div>
                      <div>
                        <Badge variant={branch.is_active ? 'secondary' : 'outline'}>
                          {branch.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!headquarters && branches.length === 0 && (
                <div className="text-center py-10">
                  <Building2 size={48} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No locations configured yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin Hierarchy Tab */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Admin Hierarchy</h2>
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">System Administrator</p>
                    <p className="text-sm text-muted-foreground">Full access to all locations and settings</p>
                    <Badge className="mt-1">role: admin</Badge>
                  </div>
                </div>
                <div className="border-l-2 border-primary/30 pl-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Users size={16} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Location Managers</p>
                      <p className="text-sm text-muted-foreground">Manage specific locations and staff</p>
                      <Badge className="mt-1" variant="secondary">role: manager</Badge>
                    </div>
                  </div>
                  <div className="border-l-2 border-border pl-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Users size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Estimators & Technicians</p>
                        <p className="text-sm text-muted-foreground">Location-specific access</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">role: estimator</Badge>
                          <Badge variant="outline">role: technician</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branch Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Branch-Specific Pricing</h2>
          <Card className="border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Configure custom pricing profiles for each location to account for regional cost variations.
              </p>
              <div className="space-y-3">
                {locations.map(location => (
                  <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-xs text-muted-foreground">{location.code}</p>
                    </div>
                    <Badge variant={location.pricing_profile_id ? 'default' : 'outline'}>
                      {location.pricing_profile_id ? 'Custom Pricing' : 'Default Pricing'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Reporting Tab */}
      {activeTab === 'reporting' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Usage Reporting</h2>
          
          {usageReport?.data ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Locations</p>
                        <p className="text-lg font-bold">{usageReport.data.summary.total_locations}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Jobs</p>
                        <p className="text-lg font-bold">{usageReport.data.summary.total_jobs}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign size={20} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Value</p>
                        <p className="text-lg font-bold">${usageReport.data.summary.total_estimate_value.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users size={20} className="text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Users</p>
                        <p className="text-lg font-bold">{usageReport.data.summary.total_users}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* By Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Performance by Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {usageReport.data.by_location.map(loc => (
                      <div key={loc.location_id} className="flex items-center justify-between p-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{loc.location_name}</p>
                          <p className="text-xs text-muted-foreground">{loc.location_code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${loc.total_estimate_value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{loc.jobs_count} jobs</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-10">
              <BarChart3 size={48} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading usage data...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}