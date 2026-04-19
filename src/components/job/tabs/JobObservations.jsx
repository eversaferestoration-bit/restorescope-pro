import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Save } from 'lucide-react';
import RoomPicker from '@/components/job/RoomPicker';
import EntryList from '@/components/job/EntryList';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const TYPES = ['Visible Damage', 'Odor', 'Staining', 'Mold Growth', 'Structural', 'Other'];
const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function JobObservations({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ description: '', observation_type: '', severity: '' });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', job.id],
    queryFn: () => base44.entities.Room.filter({ job_id: job.id, is_deleted: false }, 'sort_order'),
  });

  const { data: observations = [], isLoading } = useQuery({
    queryKey: ['observations', job.id, roomId],
    queryFn: () => base44.entities.Observation.filter({ job_id: job.id, ...(roomId ? { room_id: roomId } : {}), is_deleted: false }, '-recorded_at'),
    enabled: !!job.id,
    staleTime: 3 * 60 * 1000,
    retry: 2,
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('saveObservation', data),
    onSuccess: () => {
      qc.invalidateQueries(['observations', job.id]);
      setAdding(false);
      setForm({ description: '', observation_type: '', severity: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('softDeleteRecord', { entity_type: 'Observation', entity_id: id }),
    onSuccess: () => qc.invalidateQueries(['observations', job.id]),
  });

  const isTechnician = user?.role === 'technician';

  const handleAdd = (e) => {
    e.preventDefault();
    if (!roomId) return;
    addMutation.mutate({
      job_id: job.id,
      room_id: roomId,
      description: form.description,
      observation_type: form.observation_type || undefined,
      severity: form.severity || undefined,
    });
  };

  const rows = observations.map((o) => ({
    id: o.id,
    primary: o.description,
    badge: o.severity || o.observation_type,
    secondary: o.observation_type,
    recorded_by: o.recorded_by,
    ts: o.recorded_at,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Observations</h3>
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
              <label className="text-xs font-medium">Type</label>
              <select className={inputCls} value={form.observation_type} onChange={(e) => setForm((f) => ({ ...f, observation_type: e.target.value }))}>
                <option value="">Select…</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Severity</label>
              <select className={inputCls} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                <option value="">Select…</option>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium">Description *</label>
              <textarea required rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe what you observed…" />
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
        <EntryList rows={rows} canDelete={!isTechnician} onDelete={(id) => deleteMutation.mutate(id)} emptyMsg="No observations yet. Select a room and add one." />
      )}
    </div>
  );
}