import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Tag, Plus, Trash2, ChevronDown, ChevronUp, Star, Save, X } from 'lucide-react';

const inputCls = 'w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';

const CATEGORIES = ['containment', 'demolition', 'drying', 'cleaning', 'deodorization', 'hepa', 'contents', 'documentation'];
const UNITS = ['SF', 'LF', 'SY', 'EA', 'HR', 'DAY', 'EA/DAY', 'LS'];

const DEFAULT_MODIFIERS = {
  modifier_emergency: 1.25,
  modifier_after_hours: 1.15,
  modifier_complexity_standard: 1.0,
  modifier_complexity_complex: 1.2,
  modifier_complexity_very_complex: 1.4,
  modifier_access_easy: 1.0,
  modifier_access_moderate: 1.1,
  modifier_access_difficult: 1.25,
};

function ProfileCard({ profile, onDelete, onSetDefault }) {
  const [open, setOpen] = useState(false);
  const [editingMods, setEditingMods] = useState(false);
  const [mods, setMods] = useState({ ...DEFAULT_MODIFIERS, ...profile });
  const qc = useQueryClient();

  const modMutation = useMutation({
    mutationFn: (data) => base44.entities.PricingProfile.update(profile.id, data),
    onSuccess: () => { qc.invalidateQueries(['pricing-profiles']); setEditingMods(false); },
  });

  const MOD_FIELDS = [
    { key: 'modifier_emergency', label: 'Emergency' },
    { key: 'modifier_after_hours', label: 'After Hours' },
    { key: 'modifier_complexity_complex', label: 'Complexity: Complex' },
    { key: 'modifier_complexity_very_complex', label: 'Complexity: Very Complex' },
    { key: 'modifier_access_moderate', label: 'Access: Moderate' },
    { key: 'modifier_access_difficult', label: 'Access: Difficult' },
  ];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm font-display">{profile.name}</span>
          {profile.is_default && <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"><Star size={10} /> Default</span>}
          <span className="text-xs text-muted-foreground">{profile.line_items?.length || 0} line items</span>
        </div>
        <div className="flex items-center gap-2">
          {!profile.is_default && (
            <button onClick={(e) => { e.stopPropagation(); onSetDefault(profile.id); }} className="h-7 px-2 rounded-lg text-xs border hover:bg-muted transition" title="Set as default">
              Set Default
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
            <Trash2 size={13} />
          </button>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Modifiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modifiers</p>
              <button onClick={() => setEditingMods(!editingMods)} className="text-xs text-primary hover:underline">{editingMods ? 'Cancel' : 'Edit'}</button>
            </div>
            {editingMods ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {MOD_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <input type="number" step="0.01" min={1} max={3} value={mods[key] ?? DEFAULT_MODIFIERS[key]}
                        onChange={(e) => setMods((m) => ({ ...m, [key]: Number(e.target.value) }))}
                        className="w-full h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setEditingMods(false)} className="px-3 h-7 rounded border text-xs hover:bg-muted transition">Cancel</button>
                  <button onClick={() => modMutation.mutate(mods)} disabled={modMutation.isPending}
                    className="px-3 h-7 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60">
                    <Save size={11} className="inline mr-1" />{modMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {MOD_FIELDS.map(({ key, label }) => (
                  <div key={key} className="bg-muted/40 rounded-lg px-2 py-1.5">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold">×{(profile[key] ?? DEFAULT_MODIFIERS[key]).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line items table */}
          <LineItemsEditor profile={profile} />
        </div>
      )}
    </div>
  );
}

function LineItemsEditor({ profile }) {
  const qc = useQueryClient();
  const [items, setItems] = useState(profile.line_items || []);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ category: 'demolition', description: '', unit: 'SF', unit_cost: '' });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.PricingProfile.update(profile.id, { line_items: data }),
    onSuccess: () => qc.invalidateQueries(['pricing-profiles']),
  });

  const addItem = () => {
    if (!newItem.description || !newItem.unit_cost) return;
    const updated = [...items, { ...newItem, unit_cost: Number(newItem.unit_cost) }];
    setItems(updated);
    saveMutation.mutate(updated);
    setNewItem({ category: 'demolition', description: '', unit: 'SF', unit_cost: '' });
    setAdding(false);
  };

  const removeItem = (idx) => {
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    saveMutation.mutate(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line Item Pricing</p>
        <button onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={11} /> Add</button>
      </div>

      {adding && (
        <div className="grid grid-cols-2 gap-2 mb-3 bg-muted/30 rounded-lg p-3">
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select className={inputCls} value={newItem.category} onChange={(e) => setNewItem((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Unit</label>
            <select className={inputCls} value={newItem.unit} onChange={(e) => setNewItem((f) => ({ ...f, unit: e.target.value }))}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Description *</label>
            <input className={inputCls} value={newItem.description} onChange={(e) => setNewItem((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Remove & dispose saturated drywall" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Unit Cost ($) *</label>
            <input type="number" step="0.01" min={0} className={inputCls} value={newItem.unit_cost} onChange={(e) => setNewItem((f) => ({ ...f, unit_cost: e.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 h-9 rounded-lg border text-xs hover:bg-muted transition"><X size={11} className="inline" /></button>
            <button onClick={addItem} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition">Add</button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground py-2">No line items — default costs will be used.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground capitalize">{item.category} · {item.unit}</p>
              </div>
              <span className="text-sm font-semibold shrink-0">${Number(item.unit_cost).toFixed(2)}</span>
              <button onClick={() => removeItem(idx)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProfileModal({ companyId, onClose }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PricingProfile.create(data),
    onSuccess: () => { qc.invalidateQueries(['pricing-profiles']); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold font-display">New Pricing Profile</h2>
          <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Profile Name *</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Water Loss" />
          </div>
          <div>
            <label className="text-xs font-medium">Description</label>
            <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description…" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 h-9 rounded-lg border text-sm hover:bg-muted transition">Cancel</button>
          <button
            onClick={() => createMutation.mutate({ company_id: companyId, name, description: desc, line_items: [], ...DEFAULT_MODIFIERS, is_deleted: false })}
            disabled={!name.trim() || createMutation.isPending}
            className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PricingProfiles() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const companyId = user?.company_id || '';

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['pricing-profiles'],
    queryFn: () => base44.entities.PricingProfile.filter({ company_id: companyId, is_deleted: false }, '-created_date'),
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PricingProfile.update(id, { is_deleted: true }),
    onSuccess: () => qc.invalidateQueries(['pricing-profiles']),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      for (const p of profiles.filter((p) => p.is_default)) {
        await base44.entities.PricingProfile.update(p.id, { is_default: false });
      }
      return base44.entities.PricingProfile.update(id, { is_default: true });
    },
    onSuccess: () => qc.invalidateQueries(['pricing-profiles']),
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Pricing Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">Define labor and material pricing for estimates</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
          <Plus size={15} /> New Profile
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : profiles.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[280px]">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Tag size={24} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold font-display">No pricing profiles yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a profile to set unit costs for your estimates.</p>
          </div>
          <button onClick={() => setShowNew(true)} className="mt-1 inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
            <Plus size={14} /> Create Profile
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} onDelete={(id) => deleteMutation.mutate(id)} onSetDefault={(id) => setDefaultMutation.mutate(id)} />
          ))}
        </div>
      )}

      {showNew && <NewProfileModal companyId={companyId} onClose={() => setShowNew(false)} />}
    </div>
  );
}