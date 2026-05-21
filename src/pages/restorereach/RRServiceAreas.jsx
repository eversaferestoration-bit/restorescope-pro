import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MapPin, Plus, X, Trash2, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SERVICES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Smoke Damage', 'Sewage Cleanup'];
const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const PRIORITY_COLORS = { high: 'text-red-400 bg-red-500/20', medium: 'text-yellow-400 bg-yellow-500/20', low: 'text-blue-400 bg-blue-500/20' };
const SEO_COLORS = { active: 'text-green-400 bg-green-500/20', pending: 'text-yellow-400 bg-yellow-500/20', none: 'text-slate-400 bg-slate-500/20' };

export default function RRServiceAreas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ city: '', state: '', county: '', zip_codes: '', priority_level: 'medium', services_offered: [], seo_status: 'none' });

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const companyId = profile?.[0]?.id || user?.email || 'default';

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RRServiceArea.create({
      ...data,
      company_id: companyId,
      zip_codes: data.zip_codes ? data.zip_codes.split(',').map(z => z.trim()) : [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-areas'] });
      toast({ title: '✅ Service area added' });
      setForm({ city: '', state: '', county: '', zip_codes: '', priority_level: 'medium', services_offered: [], seo_status: 'none' });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RRServiceArea.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-areas'] }),
  });

  const updateSeo = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RRServiceArea.update(id, { seo_status: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-areas'] }),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));
  const toggleService = (s) => setForm((f) => ({
    ...f,
    services_offered: f.services_offered.includes(s) ? f.services_offered.filter(x => x !== s) : [...f.services_offered, s],
  }));

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin size={22} style={{ color: '#e05a1c' }} /> Service Areas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Define and manage your local coverage zones</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: '#e05a1c' }}>
          <Plus size={15} /> Add Area
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Areas', value: areas.length, color: '#3b82f6' },
          { label: 'SEO Active', value: areas.filter(a => a.seo_status === 'active').length, color: '#10b981' },
          { label: 'High Priority', value: areas.filter(a => a.priority_level === 'high').length, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 border text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>{label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#0d1829' }} />)}</div>
      ) : areas.length === 0 ? (
        <div className="rounded-xl border py-16 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <MapPin size={32} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
          <p className="text-white font-semibold">No service areas yet</p>
          <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>Add your first service area to start tracking coverage</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {areas.map((area) => (
            <div key={area.id} className="rounded-xl border p-4 hover:border-orange-500/30 transition-colors" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{area.city}, {area.state}</p>
                  {area.county && <p className="text-xs" style={{ color: '#7ba3c8' }}>{area.county} County</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLORS[area.priority_level] || PRIORITY_COLORS.medium}`}>
                    {area.priority_level}
                  </span>
                  <button onClick={() => deleteMutation.mutate(area.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 transition">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {area.services_offered?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {area.services_offered.map(s => (
                    <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{s}</span>
                  ))}
                </div>
              )}
              {area.zip_codes?.length > 0 && (
                <p className="text-xs mb-2" style={{ color: '#3a5a7c' }}>Zips: {area.zip_codes.slice(0, 5).join(', ')}{area.zip_codes.length > 5 ? '…' : ''}</p>
              )}
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${SEO_COLORS[area.seo_status] || SEO_COLORS.none}`}>
                  SEO: {area.seo_status}
                </span>
                {area.seo_status !== 'active' && (
                  <button onClick={() => updateSeo.mutate({ id: area.id, status: 'active' })}
                    className="text-xs px-2 py-1 rounded-lg text-green-400 hover:bg-green-500/10 transition">
                    Activate SEO
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Area Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg rounded-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add Service Area</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">City *</label>
                <input className={inp} style={inpStyle} placeholder="Nashville" value={form.city} onChange={set('city')} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">State *</label>
                <input className={inp} style={inpStyle} placeholder="TN" value={form.state} onChange={set('state')} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">County</label>
                <input className={inp} style={inpStyle} placeholder="Davidson" value={form.county} onChange={set('county')} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Priority</label>
                <select className={inp} style={inpStyle} value={form.priority_level} onChange={set('priority_level')}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-400 mb-1 block">ZIP Codes (comma separated)</label>
                <input className={inp} style={inpStyle} placeholder="37201, 37202, 37203" value={form.zip_codes} onChange={set('zip_codes')} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-400 mb-2 block">Services Offered</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(s => (
                    <button key={s} onClick={() => toggleService(s)} type="button"
                      className={`text-xs px-2.5 py-1 rounded-lg border transition ${form.services_offered.includes(s) ? 'text-white border-orange-500' : 'text-slate-400 border-slate-700 hover:border-slate-500'}`}
                      style={form.services_offered.includes(s) ? { background: '#e05a1c22' } : { background: '#0a1020' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border text-slate-400 hover:text-white transition" style={{ borderColor: '#1e2d45' }}>Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.city || !form.state || createMutation.isPending}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#e05a1c' }}>
                <CheckCircle size={14} /> {createMutation.isPending ? 'Saving…' : 'Add Area'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}