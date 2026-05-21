import { useState } from 'react';
import { Building2, Phone, MapPin, Globe, Edit2, Save, X } from 'lucide-react';

const inp = 'w-full px-3 py-2 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45' };

export default function MasterNAPPanel({ masterNAP, onChange }) {
  const [editing, setEditing] = useState(!masterNAP?.business_name);
  const [draft, setDraft] = useState(masterNAP || { business_name: '', address: '', phone: '', website: '' });
  const set = k => e => setDraft(d => ({ ...d, [k]: e.target.value }));

  const save = () => { onChange(draft); setEditing(false); };

  const fields = [
    { key: 'business_name', label: 'Business Name', icon: Building2, placeholder: 'ABC Restoration LLC' },
    { key: 'address', label: 'Address', icon: MapPin, placeholder: '123 Main St, Nashville, TN 37201' },
    { key: 'phone', label: 'Phone', icon: Phone, placeholder: '(555) 000-0000' },
    { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://yoursite.com' },
  ];

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Building2 size={14} style={{ color: '#3b82f6' }} />
          <span className="text-sm font-semibold text-white">Master NAP (Source of Truth)</span>
        </div>
        {!editing
          ? <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition"
              style={{ background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
              <Edit2 size={10} /> Edit
            </button>
          : <div className="flex gap-2">
              <button onClick={save} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white transition" style={{ background: '#10b981' }}>
                <Save size={10} /> Save
              </button>
              {masterNAP?.business_name && (
                <button onClick={() => { setDraft(masterNAP); setEditing(false); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition" style={{ color: '#3a5a7c' }}>
                  <X size={13} />
                </button>
              )}
            </div>}
      </div>

      <div className="p-4">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.key}>
                  <label className="text-xs font-semibold flex items-center gap-1 mb-1.5" style={{ color: '#7ba3c8' }}>
                    <Icon size={10} /> {f.label}
                  </label>
                  <input className={inp} style={inpStyle} placeholder={f.placeholder}
                    value={draft[f.key] || ''} onChange={set(f.key)} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {fields.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.key}>
                  <div className="flex items-center gap-1 mb-1">
                    <Icon size={10} style={{ color: '#3a5a7c' }} />
                    <p className="text-xs" style={{ color: '#3a5a7c' }}>{f.label}</p>
                  </div>
                  <p className="text-xs font-semibold text-white break-words">{masterNAP?.[f.key] || <span style={{ color: '#3a5a7c' }}>Not set</span>}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}