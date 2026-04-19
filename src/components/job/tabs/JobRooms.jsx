import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { logAction } from '@/lib/auditLog';
import { Plus, Trash2, Save, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const ROOM_TYPES = ['Living Room', 'Bedroom', 'Bathroom', 'Kitchen', 'Hallway', 'Basement', 'Attic', 'Garage', 'Office', 'Other'];
const FLOOR_LEVELS = ['Basement', '1st Floor', '2nd Floor', '3rd Floor', 'Attic'];
const STATUS_OPTIONS = ['dry', 'wet', 'drying', 'cleared'];

const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const selectCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function RoomCard({ room, obsCount, onDelete }) {
  const [open, setOpen] = useState(false);
  const hasObs = obsCount > 0;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-sm truncate">{room.name}</span>
          {room.room_type && <span className="text-xs text-muted-foreground hidden sm:inline">{room.room_type}</span>}
          {room.floor_level && <span className="text-xs bg-muted px-2 py-0.5 rounded-full hidden sm:inline">{room.floor_level}</span>}
          {!hasObs && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
              <AlertTriangle size={11} /> No obs
            </span>
          )}
          {hasObs && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{obsCount} obs</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(room.id); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 size={13} />
          </button>
          {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-border pt-3">
          {[
            { label: 'Status', value: room.status },
            { label: 'Size (sqft)', value: room.size_sqft },
            { label: 'Ceiling Height', value: room.ceiling_height_ft ? `${room.ceiling_height_ft} ft` : null },
            { label: 'Contains Contents', value: room.contains_contents ? 'Yes' : 'No' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium">{value || '—'}</p>
            </div>
          ))}
          {room.affected_materials?.length > 0 && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-muted-foreground mb-1">Affected Materials</p>
              <div className="flex flex-wrap gap-1.5">
                {room.affected_materials.map((m) => (
                  <span key={m} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}
          {room.notes && <div className="col-span-2 md:col-span-3"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{room.notes}</p></div>}
          {!hasObs && (
            <div className="col-span-2 md:col-span-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700 font-medium">⚠ At least one observation is required before this room can be scoped.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobRooms({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', room_type: '', floor_level: '', size_sqft: '', ceiling_height_ft: '', status: '', notes: '' });

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', job.id],
    queryFn: () => base44.entities.Room.filter({ job_id: job.id, is_deleted: false }, 'sort_order'),
  });

  // Observation counts per room
  const { data: observations = [] } = useQuery({
    queryKey: ['observations', job.id, null],
    queryFn: () => base44.entities.Observation.filter({ job_id: job.id, is_deleted: false }, '-recorded_at'),
    enabled: rooms.length > 0,
  });
  const obsByRoom = observations.reduce((acc, o) => { acc[o.room_id] = (acc[o.room_id] || 0) + 1; return acc; }, {});

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.Room.create(data),
    onSuccess: async (room) => {
      await logAction(user, 'Room', room.id, 'created', `Room "${room.name}" added to job ${job.job_number}`, { job_id: job.id });
      qc.invalidateQueries(['rooms', job.id]);
      setAdding(false);
      setForm({ name: '', room_type: '', floor_level: '', size_sqft: '', ceiling_height_ft: '', status: '', notes: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Room.update(id, { is_deleted: true }),
    onSuccess: () => qc.invalidateQueries(['rooms', job.id]),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
        >
          <Plus size={13} /> Add Room
        </button>
      </div>

      {adding && (
        <form
          onSubmit={(e) => { e.preventDefault(); addMutation.mutate({ ...form, company_id: job.company_id, job_id: job.id, is_deleted: false, size_sqft: form.size_sqft ? Number(form.size_sqft) : undefined, ceiling_height_ft: form.ceiling_height_ft ? Number(form.ceiling_height_ft) : undefined }); }}
          className="bg-card rounded-xl border border-primary/40 p-4 grid grid-cols-2 gap-3"
        >
          <div className="col-span-2"><label className="text-xs font-medium">Room Name *</label><input required className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Master Bedroom" /></div>
          <div><label className="text-xs font-medium">Room Type</label><select className={selectCls} value={form.room_type} onChange={set('room_type')}><option value="">Select…</option>{ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="text-xs font-medium">Floor Level</label><select className={selectCls} value={form.floor_level} onChange={set('floor_level')}><option value="">Select…</option>{FLOOR_LEVELS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
          <div><label className="text-xs font-medium">Size (sqft)</label><input type="number" className={inputCls} value={form.size_sqft} onChange={set('size_sqft')} /></div>
          <div><label className="text-xs font-medium">Ceiling Height (ft)</label><input type="number" className={inputCls} value={form.ceiling_height_ft} onChange={set('ceiling_height_ft')} /></div>
          <div><label className="text-xs font-medium">Status</label><select className={selectCls} value={form.status} onChange={set('status')}><option value="">Select…</option>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="col-span-2"><label className="text-xs font-medium">Notes</label><textarea className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" rows={2} value={form.notes} onChange={set('notes')} /></div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Cancel</button>
            <button type="submit" disabled={addMutation.isPending} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60"><Save size={12} />{addMutation.isPending ? 'Adding…' : 'Add Room'}</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : rooms.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No rooms added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} obsCount={obsByRoom[r.id] || 0} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}