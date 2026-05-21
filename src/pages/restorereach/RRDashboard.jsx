import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import {
  TrendingUp, PhoneCall, Star, MapPin, CloudLightning, FileText, ArrowRight,
  Building2, Zap, Activity
} from 'lucide-react';

function StatCard({ label, value, icon: IconComp, color, sub }) {
  const Icon = IconComp;
  return (
    <div className="rounded-xl p-5 border" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>Live</span>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm" style={{ color: '#7ba3c8' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#3a5a7c' }}>{sub}</p>}
    </div>
  );
}

function QuickAction({ label, desc, path, icon: Icon, color }) {
  return (
    <Link to={path}>
      <div className="rounded-xl p-4 border hover:border-orange-500/50 transition-all group cursor-pointer"
        style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '22' }}>
            <Icon size={17} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs truncate" style={{ color: '#7ba3c8' }}>{desc}</p>
          </div>
          <ArrowRight size={14} className="text-slate-500 group-hover:text-orange-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function RRDashboard() {
  const { user } = useAuth();

  const { data: leads = [] } = useQuery({
    queryKey: ['rr-leads'],
    queryFn: () => base44.entities.RRLeadCapture.list('-created_date', 100),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list(),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list(),
  });

  const newLeads = leads.filter((l) => l.status === 'new').length;
  const emergencyLeads = leads.filter((l) => l.urgency_level === 'emergency').length;
  const activeAreas = areas.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

  return (
    <div className="p-5 md:p-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e05a1c' }}>
            <Zap size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RestoreReach AI</h1>
        </div>
        <p style={{ color: '#7ba3c8' }} className="text-sm ml-11">
          Your automated local marketing command center
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="New Leads" value={newLeads} icon={PhoneCall} color="#e05a1c" sub="Awaiting contact" />
        <StatCard label="Emergency" value={emergencyLeads} icon={Activity} color="#ef4444" sub="Urgent jobs" />
        <StatCard label="Service Areas" value={activeAreas} icon={MapPin} color="#3b82f6" sub="Tracked zones" />
        <StatCard label="Active Campaigns" value={activeCampaigns} icon={TrendingUp} color="#10b981" sub="Running now" />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction label="Capture Emergency Lead" desc="Log a new inbound lead fast" path="/restorereach/leads" icon={PhoneCall} color="#ef4444" />
          <QuickAction label="Generate GBP Post" desc="AI-powered Google Business content" path="/restorereach/gbp" icon={Building2} color="#3b82f6" />
          <QuickAction label="Create SEO Content" desc="City + service landing pages" path="/restorereach/content" icon={FileText} color="#10b981" />
          <QuickAction label="Request Reviews" desc="Send automated review requests" path="/restorereach/reviews" icon={Star} color="#f59e0b" />
          <QuickAction label="Activate Storm Mode" desc="Deploy storm response campaigns" path="/restorereach/storm" icon={CloudLightning} color="#e05a1c" />
          <QuickAction label="Add Service Area" desc="Expand your coverage zone" path="/restorereach/areas" icon={MapPin} color="#8b5cf6" />
        </div>
      </div>

      {/* Recent Leads */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Recent Leads</h2>
          <Link to="/restorereach/leads" className="text-xs hover:text-orange-400 transition-colors" style={{ color: '#7ba3c8' }}>
            View all →
          </Link>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e2d45', background: '#0d1829' }}>
          {leads.length === 0 ? (
            <div className="py-10 text-center">
              <PhoneCall size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
              <p className="text-sm" style={{ color: '#7ba3c8' }}>No leads yet. Capture your first lead!</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: '#1e2d45', color: '#3a5a7c' }}>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Service</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Source</th>
                  <th className="px-4 py-3 text-left">Urgency</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 8).map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-white/3 transition-colors" style={{ borderColor: '#1e2d45' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lead.customer_name}</p>
                      <p className="text-xs" style={{ color: '#7ba3c8' }}>{lead.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: '#7ba3c8' }}>{lead.service_needed || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{lead.source || 'direct'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        lead.urgency_level === 'emergency' ? 'bg-red-500/20 text-red-400' :
                        lead.urgency_level === 'urgent' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{lead.urgency_level || 'standard'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        lead.status === 'new' ? 'bg-green-500/20 text-green-400' :
                        lead.status === 'converted' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{lead.status || 'new'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}