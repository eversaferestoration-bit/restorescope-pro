import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, User } from 'lucide-react';

export default function UserSelector({ label, value, onChange }) {
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
  });

  const selected = users.find((u) => u.id === value);

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium">{label}</label>}
      <div className="relative">
        <select
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))}
        </select>
      </div>
      {selected && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <User size={11} /> {selected.email}
        </p>
      )}
    </div>
  );
}