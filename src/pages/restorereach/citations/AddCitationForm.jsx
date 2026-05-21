import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, X } from 'lucide-react';

const inp = 'w-full px-3 py-2.5 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45' };

const POPULAR_DIRECTORIES = [
  'Google Business Profile', 'Yelp', 'Facebook', 'Apple Maps', 'Bing Places',
  'Yellow Pages', 'BBB', 'Angi', 'HomeAdvisor', 'Thumbtack',
  'Houzz', 'Nextdoor', 'Manta', 'Foursquare', 'Citysearch',
];

const STATUS_OPTIONS = [
  { value: 'consistent', label: '✅ Consistent' },
  { value: 'inconsistent', label: '⚠️ Inconsistent' },
  { value: 'missing', label: '❌ Missing' },
  { value: 'unchecked', label: '🔍 Unchecked' },
];

const BLANK = {
  directory_name: '', listing_url: '', business_name: '',
  address: '', phone: '', website: '',
  status: 'unchecked', last_checked: '', consistency_score: '', notes: '',
};

export default function AddCitationForm({ companyId, masterNAP, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    ...BLANK,
    business_name: masterNAP?.business_name || '',
    address: masterNAP?.address || '',
    phone: masterNAP?.phone || '',
    website: masterNAP?.website || '',
  });
  const [custom, setCustom] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const mutation = useMutation({
    mutationFn: data => base44.entities.Citation.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citations'], exact: false });
      toast({ title: '✅ Citation added' });
      if (onClose) onClose();
    },
  });

  const handleSubmit = () => {
    if (!form.directory_name) {
      toast({ title: 'Directory name is required', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      ...form,
      company_id: companyId,
      consistency_score: form.consistency_score ? parseInt(form.consistency_score) : 0,
    });
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <PlusCircle size={14} style={{ color: '#e05a1c' }} />
          <span className="text-sm font-semibold text-white">Add Citation / Listing</span>
        </div>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>}
      </div>

      <div className="p-5 space-y-4">
        {/* Directory picker */}
        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: '#7ba3c8' }}>
            Directory <span style={{ color: '#ef4444' }}>*</span>
          </label>
          {!custom ? (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {POPULAR_DIRECTORIES.map(d => (
                  <button key={d} type="button"
                    onClick={() => setForm(f => ({ ...f, directory_name: d }))}
                    className="text-xs px-2.5 py-1.5 rounded-xl border transition"
                    style={form.directory_name === d
                      ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
                      : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}>
                    {d}
                  </button>
                ))}
              </div>
              <button onClick={() => setCustom(true)} className="text-xs" style={{ color: '#3a5a7c' }}>
                + Enter custom directory
              </button>
            </>
          ) : (
            <input className={inp} style={inpStyle} placeholder="Custom directory name"
              value={form.directory_name} onChange={set('directory_name')}
              autoFocus />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Listing URL</label>
            <input className={inp} style={inpStyle} placeholder="https://..." value={form.listing_url} onChange={set('listing_url')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Status</label>
            <select className={inp} style={inpStyle} value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Business Name (as listed)</label>
            <input className={inp} style={inpStyle} placeholder="ABC Restoration LLC" value={form.business_name} onChange={set('business_name')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Phone (as listed)</label>
            <input className={inp} style={inpStyle} placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Address (as listed)</label>
            <input className={inp} style={inpStyle} placeholder="123 Main St, Nashville, TN 37201" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Website (as listed)</label>
            <input className={inp} style={inpStyle} placeholder="https://..." value={form.website} onChange={set('website')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Last Checked</label>
            <input type="date" className={inp} style={inpStyle} value={form.last_checked} onChange={set('last_checked')} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Consistency Score (0–100)</label>
            <input type="number" min={0} max={100} className={inp} style={inpStyle} placeholder="85" value={form.consistency_score} onChange={set('consistency_score')} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>Notes</label>
          <textarea className={inp + ' resize-none'} style={inpStyle} rows={2}
            placeholder="Any discrepancies or observations…" value={form.notes} onChange={set('notes')} />
        </div>

        <button onClick={handleSubmit} disabled={mutation.isPending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: '#e05a1c' }}>
          {mutation.isPending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <PlusCircle size={14} />}
          {mutation.isPending ? 'Saving…' : 'Add Citation'}
        </button>
      </div>
    </div>
  );
}