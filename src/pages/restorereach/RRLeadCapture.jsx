import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Phone, Plus, X, CheckCircle, Clock, UserCheck, AlertCircle, Filter } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SERVICES = ['Water Damage', 'Fire Damage', 'Mold Remediation', 'Storm Damage', 'Smoke Damage', 'Sewage Cleanup', 'Asbestos', 'Biohazard', 'Roof Tarping', 'Board Up'];
const SOURCES = ['gbp', 'website', 'social', 'storm_alert', 'referral', 'direct', 'other'];
const URGENCY = ['emergency', 'urgent', 'standard', 'quote_only'];
const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

function UrgencyBadge({ level }) {
  const map = {
    emergency: 'bg-red-500/20 text-red-400 border-red-500/30',
    urgent: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    standard: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    quote_only: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${map[level] || map.standard}`}>{level?.replace('_', ' ')}</span>;
}

function StatusBadge({ status }) {
  const map = {
    new: 'bg-green-500/20 text-green-400',
    contacted: 'bg-yellow-500/20 text-yellow-400',
    qualified: 'bg-blue-500/20 text-blue-400',
    converted: 'bg-purple-500/20 text-purple-400',
    lost: 'bg-slate-500/20 text-slate-400',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${map[status] || map.new}`}>{status}</span>;
}

export default function RRLeadCapture() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    customer_name: '', phone: '', email: '', property_address: '',
    service_needed: '', urgency_level: 'standard', source: 'direct', notes: '',
  });

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const companyId = profile?.[0]?.id || user?.email || 'default';

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['rr-leads'],
    queryFn: () => base44.entities.RRLeadCapture.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RRLeadCapture.create({
      ...data,
      company_id: companyId,
      status: 'new',
      created_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-leads'] });
      toast({ title: '✅ Lead captured successfully' });
      setForm({ customer_name: '', phone: '', email: '', property_address: '', service_needed: '', urgency_level: 'standard', source: 'direct', notes: '' });
      setShowForm(false);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RRLeadCapture.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-leads'] }),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));
  const filtered = filterStatus === 'all' ? leads : leads.filter((l) => l.status === filterStatus);

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Phone size={22} style={{ color: '#e05a1c' }} /> Lead Capture
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Capture and manage inbound restoration leads</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: '#e05a1c' }}>
          <Plus size={15} /> New Lead
        </button>
      </div>

      {/* Emergency capture banner */}
      <div className="rounded-xl p-4 mb-6 border border-red-500/30 flex items-center gap-3" style={{ background: '#2a0a0a' }}>
        <AlertCircle size={20} className="text-red-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-400">Emergency Lead?</p>
          <p className="text-xs text-red-300/70">Capture fast — click New Lead and set urgency to Emergency</p>
        </div>
        <button onClick={() => { setForm((f) => ({ ...f, urgency_level: 'emergency' })); setShowForm(true); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition shrink-0">
          Emergency Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filterStatus === s ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            style={filterStatus === s ? { background: '#e05a1c' } : { background: '#1e2d45' }}>
            {s === 'all' ? `All (${leads.length})` : s}
          </button>
        ))}
      </div>

      {/* Lead List */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#0d1829' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border py-16 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <Phone size={32} className="mx-auto mb-3" style={{ color: '#3a5a7c' }} />
          <p className="text-white font-semibold">No leads yet</p>
          <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>Capture your first lead to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <div key={lead.id} className="rounded-xl border p-4 hover:border-orange-500/30 transition-colors" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-white">{lead.customer_name}</p>
                    <UrgencyBadge level={lead.urgency_level} />
                    <StatusBadge status={lead.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: '#7ba3c8' }}>
                    {lead.phone && <span>📞 {lead.phone}</span>}
                    {lead.email && <span>✉️ {lead.email}</span>}
                    {lead.service_needed && <span>🔧 {lead.service_needed}</span>}
                    {lead.property_address && <span>📍 {lead.property_address}</span>}
                    <span className="capitalize">via {lead.source}</span>
                  </div>
                  {lead.notes && <p className="text-xs mt-1.5 italic" style={{ color: '#3a5a7c' }}>{lead.notes}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {lead.status !== 'converted' && lead.status !== 'lost' && (
                    <select value={lead.status} onChange={(e) => updateStatus.mutate({ id: lead.id, status: e.target.value })}
                      className="text-xs px-2 py-1 rounded-lg border focus:outline-none text-white"
                      style={{ background: '#1e2d45', borderColor: '#2e4060' }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Lead Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg rounded-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Capture New Lead</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-400 mb-1 block">Customer Name *</label>
                <input className={inp} style={inpStyle} placeholder="John Smith" value={form.customer_name} onChange={set('customer_name')} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Phone</label>
                <input className={inp} style={inpStyle} placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Email</label>
                <input className={inp} style={inpStyle} placeholder="john@email.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-400 mb-1 block">Property Address</label>
                <input className={inp} style={inpStyle} placeholder="123 Main St, City, State" value={form.property_address} onChange={set('property_address')} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Service Needed</label>
                <select className={inp} style={inpStyle} value={form.service_needed} onChange={set('service_needed')}>
                  <option value="">Select service…</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Urgency</label>
                <select className={inp} style={inpStyle} value={form.urgency_level} onChange={set('urgency_level')}>
                  {URGENCY.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Source</label>
                <select className={inp} style={inpStyle} value={form.source} onChange={set('source')}>
                  {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-400 mb-1 block">Notes</label>
                <textarea className={inp} style={inpStyle} rows={3} placeholder="Additional details…" value={form.notes} onChange={set('notes')} />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border text-slate-400 hover:text-white transition" style={{ borderColor: '#1e2d45' }}>Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.customer_name || createMutation.isPending}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#e05a1c' }}>
                <CheckCircle size={14} /> {createMutation.isPending ? 'Saving…' : 'Save Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}