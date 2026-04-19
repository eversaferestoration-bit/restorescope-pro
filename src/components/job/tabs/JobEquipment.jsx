import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Save } from 'lucide-react';
import RoomPicker from '@/components/job/RoomPicker';
import EntryList from '@/components/job/EntryList';
import { format } from 'date-fns';

const EQUIPMENT_TYPES = ['Dehumidifier', 'Air Mover', 'Air Scrubber', 'Heater', 'Desiccant', 'Negative Air Machine', 'Hydroxyl Generator', 'Other'];
const STATUSES = ['placed', 'active', 'removed'];
const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function JobEquipment({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ equipment_type: '', model: '', serial_number: '', quantity: 1, status: 'placed', notes: '' });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', job.id],
    queryFn: () => base44.entities.Room.filter({ job_id: job.id, is_deleted: false }, 'sort_order'),
  });

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', job.id, roomId],
    queryFn: () => base44.entities.EquipmentLog.filter({ job_id: job.id, ...(roomId ? { room_id: roomId } : {}), is_deleted: false }, '-placed_at'),
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('saveEquipmentLog', data),
    onSuccess: () => {
      qc.invalidateQueries(['equipment', job.id]);
      setAdding(false);
      setForm({ equipment_type: '', model: '', serial_number: '', quantity: 1, status: 'placed', notes: '' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('softDeleteRecord', { entity_type: 'EquipmentLog', entity_id: id }),
    onSuccess: () => qc.invalidateQueries(['equipment', job.id]),
  });

  const isTechnician = user?.role === 'technician';

  const handleAdd = (e) => {
    e.preventDefault();
    if (!roomId) return;
    addMutation.mutate({
      job_id: job.id,
      room_id: roomId,
      equipment_type: form.equipment_type,
      model: form.model || undefined,
      serial_number: form.serial_number || undefined,
      quantity: Number(form.quantity),
      status: form.status,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Equipment Log</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
        >
          <Plus size={13} /> Log Equipment
        </button>
      </div>

      <RoomPicker rooms={rooms} selectedId={roomId} onSelect={(id) => setRoomId(id === roomId ? null : id)} />

      {adding && (
        <form onSubmit={handleAdd} className="bg-card rounded-xl border border-primary/40 p-4 space-y-3">
          {!roomId && <p className="text-xs text-destructive font-medium">Select a room above first.</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Type *</label>
              <select required className={inputCls} value={form.equipment_type} onChange={(e) => setForm((f) => ({ ...f, equipment_type: e.target.value }))}>
                <option value="">Select…</option>
                {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Quantity</label>
              <input type="number" min={1} className={inputCls} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Model</label>
              <input className={inputCls} value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="e.g. LGR 3500i" />
            </div>
            <div>
              <label className="text-xs font-medium">Serial #</label>
              <input className={inputCls} value={form.serial_number} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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
          {equipment.map((eq) => (
            <div key={eq.id} className="flex items-start gap-3 bg-muted/30 rounded-lg px-3 py-2.5 border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{eq.quantity > 1 ? `${eq.quantity}× ` : ''}{eq.equipment_type}{eq.model ? ` — ${eq.model}` : ''}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eq.status === 'removed' ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-700'}`}>{eq.status}</span>
                </div>
                {eq.serial_number && <p className="text-xs text-muted-foreground mt-0.5">S/N: {eq.serial_number}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{eq.placed_by}{eq.placed_at ? ' · ' + format(new Date(eq.placed_at), 'MMM d, h:mm a') : ''}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {eq.status !== 'removed' && (
                  <button onClick={() => removeMutation.mutate(eq.id)} className="h-7 px-2 rounded-lg text-xs border hover:bg-muted transition">Remove</button>
                )}
              </div>
            </div>
          ))}
          {equipment.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">No equipment logged yet.</p>}
        </div>
      )}
    </div>
  );
}