import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Check, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function formatAddress(p) {
  return [p.address_line_1, p.city, p.state, p.zip].filter(Boolean).join(', ');
}

export default function PropertySelector({ value, onChange }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ address_line_1: '', city: '', state: '', zip: '' });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ company_id: user?.company_id || '', is_deleted: false }, 'address_line_1', 100),
    enabled: !!user?.company_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries(['properties']);
      onChange(created);
      setAdding(false);
      setNewForm({ address_line_1: '', city: '', state: '', zip: '' });
    },
  });

  const filtered = properties.filter((p) =>
    !search || formatAddress(p).toLowerCase().includes(search.toLowerCase())
  );

  const selected = properties.find((p) => p.id === value?.id);

  return (
    <div className="space-y-2">
      {selected && (
        <div className="flex items-center justify-between bg-accent rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-primary" />
            <div>
              <p className="text-sm font-medium">{selected.address_line_1}</p>
              <p className="text-xs text-muted-foreground">{[selected.city, selected.state, selected.zip].filter(Boolean).join(', ')}</p>
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
              placeholder="Search address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {(search || filtered.length > 0) && !adding && (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p); setSearch(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted text-left transition border-b border-border last:border-0"
                >
                  <MapPin size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{p.address_line_1}</p>
                    <p className="text-xs text-muted-foreground">{[p.city, p.state, p.zip].filter(Boolean).join(', ')}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No results.</p>}
            </div>
          )}

          <button type="button" onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
            <Plus size={13} /> Add new property
          </button>

          {adding && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border">
              <p className="text-xs font-semibold">New Property</p>
              <input className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Address line 1 *" value={newForm.address_line_1} onChange={(e) => setNewForm((f) => ({ ...f, address_line_1: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <input className="col-span-2 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="City" value={newForm.city} onChange={(e) => setNewForm((f) => ({ ...f, city: e.target.value }))} />
                <select className="h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={newForm.state} onChange={(e) => setNewForm((f) => ({ ...f, state: e.target.value }))}>
                  <option value="">ST</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <input className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="ZIP" value={newForm.zip} onChange={(e) => setNewForm((f) => ({ ...f, zip: e.target.value }))} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAdding(false)} className="text-xs px-3 h-8 rounded-lg border hover:bg-muted transition">Cancel</button>
                <button
                  type="button"
                  disabled={!newForm.address_line_1 || createMutation.isPending}
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