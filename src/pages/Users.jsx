import { Users as UsersIcon, UserPlus } from 'lucide-react';

export default function Users() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team members and roles</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
          <UserPlus size={15} />
          Invite
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[260px]">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <UsersIcon size={24} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold font-display">No team members yet</p>
          <p className="text-sm text-muted-foreground mt-1">Invite your first team member to collaborate.</p>
        </div>
      </div>
    </div>
  );
}