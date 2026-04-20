import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Save, Droplets, Wind } from 'lucide-react';
import RoomPicker from '@/components/job/RoomPicker';
import EntryList from '@/components/job/EntryList';
import SelectBottomSheet from '@/components/mobile/SelectBottomSheet';

const MATERIALS = [
  { value: 'Drywall', label: 'Drywall' },
  { value: 'Wood Subfloor', label: 'Wood Subfloor' },
  { value: 'Carpet', label: 'Carpet' },
  { value: 'Concrete', label: 'Concrete' },
  { value: 'Plywood', label: 'Plywood' },
  { value: 'OSB', label: 'OSB' },
  { value: 'Insulation', label: 'Insulation' },
  { value: 'Other', label: 'Other' },
];
const UNITS = [
  { value: '%WME', label: '%WME' },
  { value: '%MC', label: '%MC' },
  { value: 'RH%', label: 'RH%' },
];
const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function MoistureForm({ job, roomId, user, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ location_description: '', material: '', reading_value: '', unit: '%WME', instrument: '' });
  const [optimistic, setOptimistic] = useState(null);

  const addMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('saveReading', data),
    onSuccess: () => {
      qc.invalidateQueries(['moisture', job.id]);
      setOptimistic(null);
      onClose();
    },
    onError: () => setOptimistic(null),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const optimisticData = {
      id: `temp_${Date.now()}`,
      reading_value: Number(form.reading_value),
      unit: form.unit,
      material: form.material,
      location_description: form.location_description,
      instrument: form.instrument,
      recorded_by: user?.email,
      recorded_at: new Date().toISOString(),
    };
    setOptimistic(optimisticData);
    addMutation.mutate({
      job_id: job.id,
      room_id: roomId,
      reading_type: 'moisture',
      data: { ...form, reading_value: Number(form.reading_value) },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-primary/40 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary">Moisture Reading</p>
      <div className="grid grid-cols-2 gap-3">
         <div>
           <label className="text-xs font-medium">Reading Value *</label>
           <input required type="number" step="0.1" className={inputCls} value={form.reading_value} onChange={(e) => setForm((f) => ({ ...f, reading_value: e.target.value }))} placeholder="e.g. 22" />
         </div>
         <SelectBottomSheet
           label="Unit"
           value={form.unit}
           onChange={(v) => setForm((f) => ({ ...f, unit: v }))}
           options={UNITS}
         />
         <SelectBottomSheet
           label="Material"
           value={form.material}
           onChange={(v) => setForm((f) => ({ ...f, material: v }))}
           options={MATERIALS}
           placeholder="Select…"
         />
        <div>
          <label className="text-xs font-medium">Instrument</label>
          <input className={inputCls} value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} placeholder="e.g. Delmhorst BD-10" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium">Location Description</label>
          <input className={inputCls} value={form.location_description} onChange={(e) => setForm((f) => ({ ...f, location_description: e.target.value }))} placeholder="e.g. North wall, 6 in. from floor" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Cancel</button>
        <button type="submit" disabled={addMutation.isPending} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60">
          <Save size={12} /> {addMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function EnvForm({ job, roomId, user, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ temperature_f: '', relative_humidity: '', dew_point: '', gpp: '', instrument: '' });
  const [optimistic, setOptimistic] = useState(null);

  const addMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('saveReading', data),
    onSuccess: () => {
      qc.invalidateQueries(['env', job.id]);
      setOptimistic(null);
      onClose();
    },
    onError: () => setOptimistic(null),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const optimisticData = {
      id: `temp_${Date.now()}`,
      temperature_f: form.temperature_f ? Number(form.temperature_f) : null,
      relative_humidity: form.relative_humidity ? Number(form.relative_humidity) : null,
      dew_point: form.dew_point ? Number(form.dew_point) : null,
      gpp: form.gpp ? Number(form.gpp) : null,
      instrument: form.instrument,
      recorded_by: user?.email,
      recorded_at: new Date().toISOString(),
    };
    setOptimistic(optimisticData);
    addMutation.mutate({
      job_id: job.id,
      room_id: roomId,
      reading_type: 'environmental',
      data: { ...form },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-primary/40 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary">Environmental Reading</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium">Temp (°F)</label><input type="number" step="0.1" className={inputCls} value={form.temperature_f} onChange={(e) => setForm((f) => ({ ...f, temperature_f: e.target.value }))} /></div>
        <div><label className="text-xs font-medium">RH (%)</label><input type="number" step="0.1" className={inputCls} value={form.relative_humidity} onChange={(e) => setForm((f) => ({ ...f, relative_humidity: e.target.value }))} /></div>
        <div><label className="text-xs font-medium">Dew Point (°F)</label><input type="number" step="0.1" className={inputCls} value={form.dew_point} onChange={(e) => setForm((f) => ({ ...f, dew_point: e.target.value }))} /></div>
        <div><label className="text-xs font-medium">GPP</label><input type="number" step="0.1" className={inputCls} value={form.gpp} onChange={(e) => setForm((f) => ({ ...f, gpp: e.target.value }))} /></div>
        <div className="col-span-2"><label className="text-xs font-medium">Instrument</label><input className={inputCls} value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} placeholder="e.g. Flir MR277" /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Cancel</button>
        <button type="submit" disabled={addMutation.isPending} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60">
          <Save size={12} /> {addMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function JobReadings({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState(null);
  const [addingType, setAddingType] = useState(null); // 'moisture' | 'env'

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', job.id],
    queryFn: () => base44.entities.Room.filter({ job_id: job.id, is_deleted: false }, 'sort_order'),
  });

  const { data: moisture = [] } = useQuery({
    queryKey: ['moisture', job.id, roomId],
    queryFn: () => base44.entities.MoistureReading.filter({ job_id: job.id, ...(roomId ? { room_id: roomId } : {}), is_deleted: false }, '-recorded_at'),
    staleTime: 3 * 60 * 1000,
    retry: 2,
  });

  const { data: envReadings = [] } = useQuery({
    queryKey: ['env', job.id, roomId],
    queryFn: () => base44.entities.EnvironmentalReading.filter({ job_id: job.id, ...(roomId ? { room_id: roomId } : {}), is_deleted: false }, '-recorded_at'),
    staleTime: 3 * 60 * 1000,
    retry: 2,
  });

  const deleteMoisture = useMutation({
    mutationFn: (id) => base44.functions.invoke('softDeleteRecord', { entity_type: 'MoistureReading', entity_id: id }),
    onSuccess: () => qc.invalidateQueries(['moisture', job.id]),
  });
  const deleteEnv = useMutation({
    mutationFn: (id) => base44.functions.invoke('softDeleteRecord', { entity_type: 'EnvironmentalReading', entity_id: id }),
    onSuccess: () => qc.invalidateQueries(['env', job.id]),
  });

  const isTechnician = user?.role === 'technician';

  const moistureRows = moisture.map((m) => ({
    id: m.id,
    primary: `${m.reading_value} ${m.unit || '%WME'}`,
    badge: m.material,
    secondary: m.location_description,
    recorded_by: m.recorded_by,
    ts: m.recorded_at,
  }));

  const envRows = envReadings.map((e) => ({
    id: e.id,
    primary: `${e.temperature_f != null ? e.temperature_f + '°F' : ''} ${e.relative_humidity != null ? e.relative_humidity + '% RH' : ''}`.trim(),
    secondary: e.instrument,
    badge: e.gpp ? `${e.gpp} GPP` : null,
    recorded_by: e.recorded_by,
    ts: e.recorded_at,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Readings</h3>
        <div className="flex gap-2">
          <button onClick={() => setAddingType(addingType === 'moisture' ? null : 'moisture')} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition">
            <Droplets size={13} /> Moisture
          </button>
          <button onClick={() => setAddingType(addingType === 'env' ? null : 'env')} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition">
            <Wind size={13} /> Environmental
          </button>
        </div>
      </div>

      <RoomPicker rooms={rooms} selectedId={roomId} onSelect={(id) => setRoomId(id === roomId ? null : id)} />

      {addingType === 'moisture' && roomId && (
        <MoistureForm job={job} roomId={roomId} user={user} onClose={() => setAddingType(null)} />
      )}
      {addingType === 'env' && roomId && (
        <EnvForm job={job} roomId={roomId} user={user} onClose={() => setAddingType(null)} />
      )}
      {addingType && !roomId && (
        <p className="text-xs text-destructive font-medium px-1">Select a room above first.</p>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Moisture Readings</p>
          <EntryList rows={moistureRows} canDelete={!isTechnician} onDelete={(id) => deleteMoisture.mutate(id)} emptyMsg="No moisture readings yet." />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Environmental Readings</p>
          <EntryList rows={envRows} canDelete={!isTechnician} onDelete={(id) => deleteEnv.mutate(id)} emptyMsg="No environmental readings yet." />
        </div>
      </div>
    </div>
  );
}