import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Sparkles, Zap, Plus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import RoomPicker from '@/components/job/RoomPicker';
import ScopeItemRow from '@/components/job/scope/ScopeItemRow';
import ScopeSummaryBar from '@/components/job/scope/ScopeSummaryBar';

const CATEGORIES = ['containment', 'demolition', 'drying', 'cleaning', 'deodorization', 'hepa', 'contents', 'documentation'];
const UNITS = ['SF', 'LF', 'SY', 'EA', 'HR', 'DAY', 'EA/DAY', 'LS'];

const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function AddItemForm({ jobId, roomId, companyId, onAdd, onClose }) {
  const [form, setForm] = useState({ category: 'demolition', description: '', unit: 'SF', quantity: 1, notes: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ ...form, quantity: Number(form.quantity), source: 'manual', confidence: 1.0, status: 'suggested' });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-primary/40 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Category *</label>
          <select required className={inputCls} value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Unit</label>
          <select className={inputCls} value={form.unit} onChange={set('unit')}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium">Description *</label>
          <input required className={inputCls} value={form.description} onChange={set('description')} placeholder="Line item description…" />
        </div>
        <div>
          <label className="text-xs font-medium">Quantity</label>
          <input type="number" min={0} step="0.01" className={inputCls} value={form.quantity} onChange={set('quantity')} />
        </div>
        <div>
          <label className="text-xs font-medium">Notes</label>
          <input className={inputCls} value={form.notes} onChange={set('notes')} placeholder="Optional note…" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 h-8 rounded-lg border text-xs hover:bg-muted transition">Cancel</button>
        <button type="submit" className="px-4 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition">Add Item</button>
      </div>
    </form>
  );
}

function CategoryGroup({ category, items, onConfirm, onReject, onDelete, readOnly }) {
  const [open, setOpen] = useState(true);
  const confirmed = items.filter((i) => i.status === 'confirmed').length;
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold capitalize">{category}</span>
          <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          {confirmed > 0 && <span className="text-xs text-green-600 font-medium">{confirmed} confirmed</span>}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="p-2 space-y-1.5">
          {items.map((item) => (
            <ScopeItemRow key={item.id || item._localId} item={item} onConfirm={onConfirm} onReject={onReject} onDelete={onDelete} readOnly={readOnly} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobScope({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [roomId, setRoomId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [useAi, setUseAi] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const isTechnician = user?.role === 'technician';

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', job.id],
    queryFn: () => base44.entities.Room.filter({ job_id: job.id, is_deleted: false }, 'sort_order'),
  });

  const { data: scopeItems = [], isLoading } = useQuery({
    queryKey: ['scope', job.id, roomId],
    queryFn: () => base44.entities.ScopeItem.filter({
      job_id: job.id, is_deleted: false,
      ...(roomId ? { room_id: roomId } : {}),
    }, 'category'),
    enabled: !!job.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke('saveScopeItem', { action: 'update', item_id: id, data }),
    onSuccess: () => qc.invalidateQueries(['scope', job.id]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('saveScopeItem', { action: 'delete', item_id: id, data: {} }),
    onSuccess: () => qc.invalidateQueries(['scope', job.id]),
  });

  const handleGenerate = async () => {
    if (!roomId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await base44.functions.invoke('generateScope', { job_id: job.id, room_id: roomId, use_ai: useAi });
      const suggestions = res.data.items || [];

      // Save all suggestions that don't already exist
      const existingDescs = scopeItems.map((i) => i.description + i.category);
      const newItems = suggestions.filter((s) => !existingDescs.includes(s.description + s.category));

      for (const item of newItems) {
        await base44.functions.invoke('saveScopeItem', {
          action: 'create',
          job_id: job.id,
          data: {
            room_id: roomId,
            category: item.category,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            source: item.source,
            confidence: item.confidence,
            rule_id: item.rule_id || null,
            status: 'suggested',
            notes: item.notes || null,
          },
        });
      }

      qc.invalidateQueries(['scope', job.id]);
    } catch (err) {
      setGenerateError(err?.response?.data?.message || 'Failed to generate scope. Please try again.');
    }
    setGenerating(false);
  };

  const handleAddManual = async (formData) => {
    try {
      await base44.functions.invoke('saveScopeItem', {
        action: 'create',
        job_id: job.id,
        data: { room_id: roomId || null, ...formData },
      });
      qc.invalidateQueries(['scope', job.id]);
    } catch {
      setGenerateError('Failed to add item. Please try again.');
    }
  };

  const handleConfirm = (item) => {
    updateMutation.mutate({ id: item.id, data: { status: 'confirmed', confirmed_by: user?.email, confirmed_at: new Date().toISOString() } });
  };

  const handleReject = (item) => {
    updateMutation.mutate({ id: item.id, data: { status: 'rejected' } });
  };

  const handleDelete = (item) => {
    deleteMutation.mutate(item.id);
  };

  const handleConfirmAll = () => {
    const pending = scopeItems.filter((i) => i.status === 'suggested');
    pending.forEach((item) => handleConfirm(item));
  };

  // Group by category
  const grouped = useMemo(() => {
    const map = {};
    for (const item of scopeItems) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [scopeItems]);

  const pendingCount = scopeItems.filter((i) => i.status === 'suggested').length;
  const hasNoObs = !roomId; // warn if no room selected

  return (
    <div className="space-y-4">
      {/* Room picker */}
      <RoomPicker rooms={rooms} selectedId={roomId} onSelect={(id) => setRoomId(id === roomId ? null : id)} />

      {/* Generate bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={!roomId || generating}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
        >
          <Zap size={14} /> {generating ? 'Generating…' : 'Generate Scope'}
        </button>

        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="w-4 h-4 accent-primary" />
          <Sparkles size={13} className="text-primary" />
          <span className="text-sm">AI enhancement</span>
        </label>

        {!isTechnician && (
          <button
            onClick={() => setAddingManual(!addingManual)}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition ml-auto"
          >
            <Plus size={14} /> Add Item
          </button>
        )}
      </div>

      {!roomId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">Select a room above to generate or filter scope items.</p>
        </div>
      )}

      {generateError && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-destructive shrink-0" />
          <p className="text-xs text-destructive">{generateError}</p>
        </div>
      )}

      {addingManual && (
        <AddItemForm jobId={job.id} roomId={roomId} companyId={job.company_id} onAdd={handleAddManual} onClose={() => setAddingManual(false)} />
      )}

      {/* Summary + confirm all */}
      {scopeItems.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <ScopeSummaryBar items={scopeItems} />
          {pendingCount > 0 && !isTechnician && (
            <button
              onClick={handleConfirmAll}
              className="ml-auto inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition"
            >
              Confirm All ({pendingCount})
            </button>
          )}
        </div>
      )}

      {/* Items grouped by category */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <Zap size={28} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-semibold font-display">No scope items yet</p>
          <p className="text-xs text-muted-foreground mt-1">Select a room and click Generate Scope to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.filter((c) => grouped[c]?.length).map((cat) => (
            <CategoryGroup
              key={cat}
              category={cat}
              items={grouped[cat]}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onDelete={handleDelete}
              readOnly={isTechnician}
            />
          ))}
        </div>
      )}
    </div>
  );
}