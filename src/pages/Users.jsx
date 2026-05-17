import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Users as UsersIcon, UserPlus, Mail, Shield, X, CheckCircle } from 'lucide-react';

// Display roles shown in UI → mapped to backend-accepted values ('user' or 'admin')
const ROLES = [
  { label: 'Admin', value: 'admin', backendRole: 'admin' },
  { label: 'Manager', value: 'manager', backendRole: 'admin' },
  { label: 'Estimator', value: 'estimator', backendRole: 'user' },
  { label: 'Technician', value: 'technician', backendRole: 'user' },
  { label: 'User', value: 'user', backendRole: 'user' },
];

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-orange-100 text-orange-700',
  estimator: 'bg-blue-100 text-blue-700',
  technician: 'bg-green-100 text-green-700',
  user: 'bg-muted text-muted-foreground',
};

export default function Users() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'platform_admin';
  const companyId = user?.company_id;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['team-profiles', companyId],
    enabled: !!companyId,
    queryFn: () =>
      base44.entities.UserProfile.filter(
        { company_id: companyId, is_deleted: false },
        'full_name',
        200
      ),
    staleTime: 2 * 60 * 1000,
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) { setErrorMsg('Email is required.'); return; }

    setInviting(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Map display role to backend-accepted role ('user' or 'admin')
    const roleEntry = ROLES.find((r) => r.value === inviteRole);
    const backendRole = roleEntry?.backendRole || 'user';

    try {
      await base44.users.inviteUser(inviteEmail.trim().toLowerCase(), backendRole);
      setSuccessMsg(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteRole('user');
      setShowInvite(false);
      queryClient.invalidateQueries({ queryKey: ['team-profiles', companyId] });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to send invite. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team members and roles</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowInvite(true); setErrorMsg(''); setSuccessMsg(''); }}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            <UserPlus size={15} /> Invite
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <div className="mb-5 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Invite Team Member</h2>
            <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground transition">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              className="flex-1 min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              <Mail size={14} /> {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      {/* User List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[260px]">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <UsersIcon size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold font-display">No team members yet</p>
            <p className="text-sm text-muted-foreground mt-1">Invite your first team member to collaborate.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
            >
              <UserPlus size={14} /> Invite Member
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {profiles.map((member) => (
            <div key={member.id} className="flex items-center gap-4 px-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield size={15} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.full_name || member.email || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
              {member.role && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[member.role] || 'bg-muted text-muted-foreground'}`}>
                  {member.role}
                </span>
              )}
              {member.status && member.status !== 'active' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 shrink-0">
                  {member.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}