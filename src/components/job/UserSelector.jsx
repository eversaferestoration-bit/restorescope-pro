import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User } from 'lucide-react';
import SelectBottomSheet from '@/components/mobile/SelectBottomSheet';

export default function UserSelector({ label, value, onChange }) {
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
  });

  const selected = users.find((u) => u.id === value);
  const options = [
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.id, label: u.full_name || u.email })),
  ];

  return (
    <div className="space-y-1.5">
      <SelectBottomSheet
        label={label}
        value={value || ''}
        onChange={(v) => onChange(v || null)}
        options={options}
        placeholder="Unassigned"
      />
      {selected && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <User size={11} /> {selected.email}
        </p>
      )}
    </div>
  );
}