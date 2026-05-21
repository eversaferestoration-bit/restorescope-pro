import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  PhoneCall, Star, MapPin, CloudLightning, FileText, Building2, Zap,
  TrendingUp, CheckCircle, AlertCircle, XCircle, Globe, ArrowRight,
  Radio, Eye, RefreshCw, ChevronRight, Activity, Lightbulb
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Ic, color, sub, loading }) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
          <Ic size={18} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-12 rounded animate-pulse mb-1" style={{ background: '#1e2d45' }} />
      ) : (
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
      )}
      <p className="text-sm" style={{ color: '#7ba3c8' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#3a5a7c' }}>{sub}</p>}
    </div>
  );
}

function UrgencyBadge({ level }) {
  const map = {
    emergency: 'bg-red-500/20 text-red-400',
    urgent: 'bg-orange-500/20 text-orange-400',
    standard: 'bg-blue-500/20 text-blue-400',
    quote_only: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${map[level] || map.standard}`}>
      {level?.replace('_', ' ') || 'standard'}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    new: 'bg-green-500/20 text-green-400',
    contacted: 'bg-yellow-500/20 text-yellow-400',
    qualified: 'bg-blue-500/20 text-blue-400',
    converted: 'bg-purple-500/20 text-purple-400',
    lost: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${map[status] || map.new}`}>
      {status || 'new'}
    </span>
  );
}

function SectionHeader({ title, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs flex items-center gap-1 transition hover:text-orange-400" style={{ color: '#7ba3c8' }}>
          {linkLabel || 'View all'} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

function ScoreBar({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: '#7ba3c8' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#1e2d45' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function RRDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [updatingLead, setUpdatingLead] = useState(null);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['rr-leads'],
    queryFn: () => base44.entities.RRLeadCapture.list('-created_date', 200),
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ['rr-areas'],
    queryFn: () => base44.entities.RRServiceArea.list(),
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list('-created_date', 100),
  });

  const { data: profileArr = [] } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const profile = profileArr[0];

  const updateLeadStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RRLeadCapture.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rr-leads'] });
      setUpdatingLead(null);
      toast({ title: 'Lead status updated' });
    },
  });

  // ── Computed metrics ──────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const monthStart = startOfMonth();
  const newThisMonth = leads.filter(l => new Date(l.created_date || l.created_at || 0) >= monthStart).length;
  const gbpPosts = campaigns.filter(c => c.campaign_type === 'gbp_post').length;
  const reviewRequests = campaigns.filter(c => c.campaign_type === 'review_request').length;
  const activeAreas = areas.length;

  // Visibility score (same logic as RRVisibilityScore page)
  const visChecks = [
    { label: 'GBP Optimization', pct: (() => {
        const gbp = campaigns.filter(c => c.campaign_type === 'gbp_post').length;
        return gbp >= 10 ? 100 : gbp >= 5 ? 70 : gbp >= 1 ? 40 : 0;
      })(), color: '#3b82f6' },
    { label: 'Reviews', pct: profile?.google_review_link ? (reviewRequests >= 5 ? 100 : reviewRequests >= 1 ? 60 : 30) : 0, color: '#f59e0b' },
    { label: 'Local Content', pct: (() => {
        const seo = campaigns.filter(c => c.campaign_type === 'seo_content').length;
        return seo >= 10 ? 100 : seo >= 3 ? 70 : seo >= 1 ? 40 : 0;
      })(), color: '#10b981' },
    { label: 'Service Area Coverage', pct: areas.length >= 10 ? 100 : areas.length >= 5 ? 70 : areas.length >= 1 ? 40 : 0, color: '#8b5cf6' },
    { label: 'Citation Consistency', pct: (profile?.website ? 25 : 0) + (profile?.facebook_url ? 25 : 0) + (profile?.google_business_profile_url ? 25 : 0) + (profile?.instagram_url ? 25 : 0), color: '#e05a1c' },
  ];
  const overallScore = Math.round(visChecks.reduce((sum, c) => sum + c.pct, 0) / visChecks.length);
  const scoreColor = overallScore >= 80 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#ef4444';

  // Storm mode
  const stormCampaigns = campaigns.filter(c => c.campaign_type === 'storm_alert');
  const activeStorm = stormCampaigns.find(c => c.status === 'active');
  const stormStatus = activeStorm ? 'active' : stormCampaigns.length > 0 ? 'monitoring' : 'inactive';

  // Recent marketing activity (last 8 campaigns)
  const recentActivity = campaigns.slice(0, 8);

  // Smart recommendations based on real data
  const recommendations = [];
  if (!profile?.google_review_link) recommendations.push({ icon: Star, color: '#f59e0b', title: 'Add your Google Review link', desc: 'Required for automated review requests. Go to Settings.', path: '/restorereach/settings' });
  if (gbpPosts < 5) recommendations.push({ icon: Building2, color: '#3b82f6', title: `Create ${5 - gbpPosts} more GBP posts`, desc: '5+ posts significantly boosts your local ranking.', path: '/restorereach/gbp' });
  if (areas.length < 3) recommendations.push({ icon: MapPin, color: '#8b5cf6', title: 'Add more service areas', desc: `You have ${areas.length} area${areas.length !== 1 ? 's' : ''}. Aim for 3+ to improve coverage.`, path: '/restorereach/areas' });
  if (leads.filter(l => l.status === 'new').length > 0) recommendations.push({ icon: PhoneCall, color: '#e05a1c', title: `${leads.filter(l => l.status === 'new').length} leads need follow-up`, desc: 'New leads waiting to be contacted.', path: '/restorereach/leads' });
  if (!campaigns.find(c => c.campaign_type === 'seo_content')) recommendations.push({ icon: FileText, color: '#10b981', title: 'Generate your first SEO page', desc: 'City + service pages drive organic traffic.', path: '/restorereach/content' });
  if (recommendations.length === 0) recommendations.push({ icon: TrendingUp, color: '#10b981', title: 'Great work! Keep creating content', desc: 'Your visibility profile looks strong.', path: '/restorereach/visibility' });

  const campaignTypeLabel = { gbp_post: 'GBP Post', seo_content: 'SEO Content', social: 'Social', storm_alert: 'Storm Alert', review_request: 'Review Request', email: 'Email' };

  return (
    <div className="p-5 md:p-7 max-w-7xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e05a1c' }}>
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">RestoreReach AI</h1>
          </div>
          <p className="text-sm ml-11" style={{ color: '#7ba3c8' }}>Local marketing command center</p>
        </div>
        {stormStatus === 'active' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-500/40 text-orange-400 text-sm font-semibold" style={{ background: '#1a0a00' }}>
            <Radio size={14} className="animate-pulse" /> Storm Mode Active
          </div>
        )}
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Leads" value={totalLeads} icon={PhoneCall} color="#e05a1c" loading={leadsLoading} />
        <StatCard label="New This Month" value={newThisMonth} icon={Activity} color="#ef4444" sub="Leads" loading={leadsLoading} />
        <StatCard label="GBP Posts" value={gbpPosts} icon={Building2} color="#3b82f6" loading={campaignsLoading} />
        <StatCard label="Review Requests" value={reviewRequests} icon={Star} color="#f59e0b" loading={campaignsLoading} />
        <StatCard label="Service Areas" value={activeAreas} icon={MapPin} color="#8b5cf6" loading={areasLoading} />
        <StatCard label="Visibility Score" value={`${overallScore}%`} icon={TrendingUp} color={scoreColor} />
      </div>

      {/* ── Row: Lead Pipeline + Storm Mode ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Lead Pipeline */}
        <div className="lg:col-span-2 rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45' }}>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <PhoneCall size={15} style={{ color: '#e05a1c' }} /> Lead Pipeline
            </h2>
            <Link to="/restorereach/leads" className="text-xs flex items-center gap-1 hover:text-orange-400 transition-colors" style={{ color: '#7ba3c8' }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>

          {leadsLoading ? (
            <div className="p-4 space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}</div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center">
              <PhoneCall size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
              <p className="text-sm" style={{ color: '#7ba3c8' }}>No leads yet</p>
              <Link to="/restorereach/leads">
                <button className="mt-3 text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ background: '#e05a1c' }}>Capture First Lead</button>
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ divideColor: '#1e2d45' }}>
              {leads.slice(0, 7).map((lead) => (
                <div key={lead.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white truncate">{lead.customer_name}</p>
                      <UrgencyBadge level={lead.urgency_level} />
                    </div>
                    <div className="flex gap-3 text-xs" style={{ color: '#7ba3c8' }}>
                      {lead.service_needed && <span>{lead.service_needed}</span>}
                      {lead.property_address && <span className="truncate max-w-[120px]">📍 {lead.property_address}</span>}
                      <span>{fmtDate(lead.created_date || lead.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {updatingLead === lead.id ? (
                      <select
                        autoFocus
                        defaultValue={lead.status}
                        onBlur={() => setUpdatingLead(null)}
                        onChange={(e) => updateLeadStatus.mutate({ id: lead.id, status: e.target.value })}
                        className="text-xs px-2 py-1 rounded-lg border text-white focus:outline-none"
                        style={{ background: '#1e2d45', borderColor: '#2e4060' }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <>
                        <StatusBadge status={lead.status} />
                        <button
                          onClick={() => setUpdatingLead(lead.id)}
                          className="text-xs px-2 py-1 rounded-lg border transition hover:border-orange-500/50 hover:text-orange-400"
                          style={{ borderColor: '#2e4060', color: '#7ba3c8' }}
                        >
                          Update
                        </button>
                        <button
                          onClick={() => navigate('/restorereach/leads')}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:bg-white/10"
                          style={{ color: '#7ba3c8' }}
                        >
                          <Eye size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Storm Mode Status */}
        <div className="rounded-xl border p-5 flex flex-col" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CloudLightning size={15} style={{ color: '#e05a1c' }} /> Storm Mode
          </h2>

          <div className={`rounded-xl p-4 mb-4 border text-center ${
            stormStatus === 'active' ? 'border-orange-500/50' :
            stormStatus === 'monitoring' ? 'border-yellow-500/30' :
            'border-slate-700'
          }`} style={{ background: stormStatus === 'active' ? '#1a0a00' : stormStatus === 'monitoring' ? '#1a1200' : '#0a1020' }}>
            <CloudLightning size={32} className="mx-auto mb-2" style={{
              color: stormStatus === 'active' ? '#e05a1c' : stormStatus === 'monitoring' ? '#f59e0b' : '#3a5a7c'
            }} />
            <p className="font-bold text-white capitalize">{stormStatus}</p>
            <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>
              {stormStatus === 'active' ? `Campaign: ${activeStorm?.campaign_name}` :
               stormStatus === 'monitoring' ? `${stormCampaigns.length} campaign(s) ready` :
               'No active storm campaigns'}
            </p>
            {stormStatus === 'active' && (
              <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-orange-400">
                <Radio size={10} className="animate-pulse" /> Live
              </div>
            )}
          </div>

          <Link to="/restorereach/storm" className="block">
            <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: stormStatus === 'active' ? '#7a3010' : '#e05a1c' }}>
              <CloudLightning size={14} />
              {stormStatus === 'active' ? 'Manage Campaign' : 'Activate Storm Mode'}
            </button>
          </Link>

          {stormCampaigns.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3a5a7c' }}>Recent Storms</p>
              {stormCampaigns.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <p className="text-xs truncate text-white max-w-[60%]">{c.target_city || c.campaign_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-500/20 text-slate-400'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row: Visibility Score + Recommended Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Visibility Score Breakdown */}
        <div className="rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={15} style={{ color: scoreColor }} /> Visibility Score
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: scoreColor }}>{overallScore}%</span>
              <Link to="/restorereach/visibility" className="text-xs hover:text-orange-400 transition-colors" style={{ color: '#7ba3c8' }}>
                Details →
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            {visChecks.map(({ label, pct, color }) => (
              <ScoreBar key={label} label={label} pct={pct} color={color} />
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb size={15} style={{ color: '#f59e0b' }} /> Recommended Actions
          </h2>
          <div className="space-y-3">
            {recommendations.slice(0, 5).map(({ icon: Ic, color, title, desc, path }, i) => (
              <Link to={path} key={i}>
                <div className="flex items-start gap-3 p-3 rounded-lg border transition hover:border-orange-500/30 group" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + '22' }}>
                    <Ic size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7ba3c8' }}>{desc}</p>
                  </div>
                  <ArrowRight size={13} className="text-slate-600 group-hover:text-orange-400 transition-colors shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Marketing Activity ── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45' }}>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Globe size={15} style={{ color: '#3b82f6' }} /> Marketing Activity
          </h2>
          <Link to="/restorereach/content" className="text-xs flex items-center gap-1 hover:text-orange-400 transition-colors" style={{ color: '#7ba3c8' }}>
            Create content <ChevronRight size={12} />
          </Link>
        </div>

        {campaignsLoading ? (
          <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}</div>
        ) : recentActivity.length === 0 ? (
          <div className="py-10 text-center">
            <Globe size={26} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
            <p className="text-sm" style={{ color: '#7ba3c8' }}>No campaigns yet. Generate your first GBP post!</p>
          </div>
        ) : (
          <div className="divide-y" style={{ divideColor: '#1e2d45' }}>
            {recentActivity.map((c) => {
              const typeColor = {
                gbp_post: '#3b82f6', seo_content: '#10b981', storm_alert: '#e05a1c',
                review_request: '#f59e0b', social: '#8b5cf6', email: '#06b6d4',
              }[c.campaign_type] || '#7ba3c8';
              return (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: typeColor + '22' }}>
                    <FileText size={13} style={{ color: typeColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.campaign_name}</p>
                    <div className="flex gap-3 text-xs mt-0.5" style={{ color: '#7ba3c8' }}>
                      <span>{c.target_city || 'General'}</span>
                      {c.target_service && <span>{c.target_service}</span>}
                      <span>{fmtDate(c.start_date || c.created_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: typeColor + '22', color: typeColor }}>
                      {campaignTypeLabel[c.campaign_type] || c.campaign_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      c.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      c.status === 'draft' ? 'bg-slate-500/20 text-slate-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}