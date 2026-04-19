import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Save } from 'lucide-react';
import RoomPicker from '@/components/job/RoomPicker';
import { format } from 'date-fns';

const TYPES = ['Full Containment', 'Mini Containment', 'Critical Barrier', 'Poly Sheeting', 'Negative Air', 'Other'];
const STATUSES = ['active', 'removed'];
const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function JobContainment({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ containment_type: '', description: '', status: 'active' });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', job.id],
    queryFn: () => base44.entities.Room.filter({ job_id: job.id, is_deleted: false }, 'sort_order'),
  });

  const { data: containments = [], isLoading } = useQuery({
    queryKey: ['containments', job.id, roomId],
    queryFn: () => base44.entities.Containment.filter({ job_id: job.id, ...(roomId ? { room_id: roomId } : {}), is_deleted: false }, '-installed_at'),
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.Containment.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['containments', job.id]);
      setAdding(false);
      setForm({ containment_type: '', description: '', status: 'active' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.Containment.update(id, { status: 'removed', removed_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries(['containments', job.id]),
  });

  const isTechnician = user?.role === 'technician';

  const handleAdd = (e) => {
    e.preventDefault();
    if (!roomId) return;
    addMutation.mutate({
      ...form,
      job_id: job.id,
      room_id: roomId,
      company_id: job.company_id,
      installed_by: user?.email,
      installed_at: new Date().toISOString(),
      is_deleted: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Containment</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      <RoomPicker rooms={rooms} selectedId={roomId} onSelect={(id) => setRoomId(id === roomId ? null : id)} />

      {adding && (
        <form onSubmit={handleAdd} className="bg-card rounded-xl border border-primary/40 p-4 space-y-3">
          {!roomId && <p className="text-xs text-destructive font-medium">Select a room above first.</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Type *</label>
              <select required className={inputCls} value={form.containment_type} onChange={(e) => setForm((f) => ({ ...f, containment_type: e.target.value }))}>
                <option value="">Select…</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium">Description</label>
              <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Details about the containment setup…" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Cancel</button>
            <button type="submit" disabled={!roomId || addMutation.isPending} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60">
              <Save size={12} /> {addMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? <div className="h-20 rounded-xl bg-muted animate-pulse" /> : (
        <div className="space-y-2">
          {containments.map((c) => (
            <div key={c.id} className="flex items-start gap-3 bg-muted/30 rounded-lg px-3 py-2.5 border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.containment_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'removed' ? 'bg-muted text-muted-foreground' : 'bg-orange-100 text-orange-700'}`}>{c.status}</span>
                </div>
                {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{c.installed_by} · {c.installed_at && format(new Date(c.installed_at), 'MMM d, h:mm a')}</p>
              </div>
              {c.status !== 'removed' && (
                <button onClick={() => removeMutation.mutate(c.id)} className="h-7 px-2 rounded-lg text-xs border hover:bg-muted transition shrink-0">Remove</button>
              )}
            </div>
          ))}
          {containments.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">No containment logged yet.</p>}
        </div>
      )}
    </div>
  );
}