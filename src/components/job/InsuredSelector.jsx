import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Check, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function InsuredSelector({ value, onChange }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ full_name: '', email: '', phone: '' });

  const { data: insureds = [] } = useQuery({
    queryKey: ['insureds'],
    queryFn: () => base44.entities.Insured.filter({ company_id: user?.company_id || '', is_deleted: false }, 'full_name', 100),
    enabled: !!user?.company_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Insured.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries(['insureds']);
      onChange(created);
      setAdding(false);
      setNewForm({ full_name: '', email: '', phone: '' });
    },
  });

  const filtered = insureds.filter((i) =>
    !search || i.full_name?.toLowerCase().includes(search.toLowerCase()) || i.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = insureds.find((i) => i.id === value?.id);

  return (
    <div className="space-y-2">
      {/* Selected badge */}
      {selected && (
        <div className="flex items-center justify-between bg-accent rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-primary" />
            <div>
              <p className="text-sm font-medium">{selected.full_name}</p>
              {selected.email && <p className="text-xs text-muted-foreground">{selected.email}</p>}
            </div>
          </div>
          <button onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-destructive transition">Remove</button>
        </div>
      )}

      {!selected && (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search insured…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {(search || filtered.length > 0) && !adding && (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => { onChange(i); setSearch(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted text-left transition border-b border-border last:border-0"
                >
                  <User size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{i.full_name}</p>
                    {i.email && <p className="text-xs text-muted-foreground">{i.email}</p>}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">No results.</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setAdding(!adding)}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <Plus size={13} /> Add new insured
          </button>

          {adding && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border">
              <p className="text-xs font-semibold">New Insured</p>
              <input className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Full name *" value={newForm.full_name} onChange={(e) => setNewForm((f) => ({ ...f, full_name: e.target.value }))} />
              <input className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Email" value={newForm.email} onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))} />
              <input className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Phone" value={newForm.phone} onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAdding(false)} className="text-xs px-3 h-8 rounded-lg border hover:bg-muted transition">Cancel</button>
                <button
                  type="button"
                  disabled={!newForm.full_name || createMutation.isPending}
                  onClick={() => createMutation.mutate({ ...newForm, company_id: user?.company_id || '', is_deleted: false })}
                  className="text-xs px-3 h-8 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}