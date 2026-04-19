import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';

const LOSS_TYPES = ['water', 'fire', 'mold', 'storm', 'wind', 'smoke', 'biohazard', 'other'];
const SERVICE_TYPES = ['Mitigation', 'Restoration', 'Contents', 'Reconstruction', 'Inspection Only'];
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'approved', 'closed'];
const COMPLEXITY = ['Low', 'Medium', 'High', 'Complex'];
const ACCESS_DIFF = ['Easy', 'Moderate', 'Difficult', 'Restricted'];

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';
const selectCls = 'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

export default function JobOverview({ job }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...job });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Job.update(job.id, data),
    onSuccess: () => {
      qc.invalidateQueries(['job', job.id]);
      setEditing(false);
    },
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)} className="text-sm text-primary font-medium hover:underline">Edit</button>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Job Number" value={job.job_number} />
          <InfoRow label="Status" value={job.status?.replace(/_/g, ' ')} />
          <InfoRow label="Loss Type" value={job.loss_type ? job.loss_type.charAt(0).toUpperCase() + job.loss_type.slice(1) : null} />
          <InfoRow label="Service Type" value={job.service_type} />
          <InfoRow label="Cause of Loss" value={job.cause_of_loss} />
          <InfoRow label="Complexity" value={job.complexity_level} />
          <InfoRow label="Access Difficulty" value={job.access_difficulty} />
          <InfoRow label="Date of Loss" value={job.date_of_loss ? format(new Date(job.date_of_loss), 'MMM d, yyyy') : null} />
          <InfoRow label="Inspection Date" value={job.inspection_date ? format(new Date(job.inspection_date), 'MMM d, yyyy') : null} />
          <InfoRow label="Emergency" value={job.emergency_flag ? 'Yes' : 'No'} />
          <InfoRow label="After Hours" value={job.after_hours_flag ? 'Yes' : 'No'} />
          <InfoRow label="Created By" value={job.created_by} />
        </div>
        {job.summary_notes && (
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground mb-1">Summary Notes</p>
            <p className="text-sm whitespace-pre-wrap">{job.summary_notes}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="block text-xs font-medium mb-1">Job Number</label><input className={inputCls} value={form.job_number || ''} onChange={set('job_number')} /></div>
        <div><label className="block text-xs font-medium mb-1">Status</label>
          <select className={selectCls} value={form.status || ''} onChange={set('status')}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium mb-1">Loss Type</label>
          <select className={selectCls} value={form.loss_type || ''} onChange={set('loss_type')}>
            <option value="">Select…</option>
            {LOSS_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium mb-1">Service Type</label>
          <select className={selectCls} value={form.service_type || ''} onChange={set('service_type')}>
            <option value="">Select…</option>
            {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium mb-1">Date of Loss</label><input type="date" className={inputCls} value={form.date_of_loss || ''} onChange={set('date_of_loss')} /></div>
        <div><label className="block text-xs font-medium mb-1">Inspection Date</label><input type="date" className={inputCls} value={form.inspection_date || ''} onChange={set('inspection_date')} /></div>
        <div><label className="block text-xs font-medium mb-1">Complexity</label>
          <select className={selectCls} value={form.complexity_level || ''} onChange={set('complexity_level')}>
            <option value="">Select…</option>
            {COMPLEXITY.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium mb-1">Access Difficulty</label>
          <select className={selectCls} value={form.access_difficulty || ''} onChange={set('access_difficulty')}>
            <option value="">Select…</option>
            {ACCESS_DIFF.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="block text-xs font-medium mb-1">Cause of Loss</label><input className={inputCls} value={form.cause_of_loss || ''} onChange={set('cause_of_loss')} /></div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="ef" checked={!!form.emergency_flag} onChange={(e) => setForm((f) => ({ ...f, emergency_flag: e.target.checked }))} className="w-4 h-4 accent-primary" />
          <label htmlFor="ef" className="text-sm">Emergency</label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="ahf" checked={!!form.after_hours_flag} onChange={(e) => setForm((f) => ({ ...f, after_hours_flag: e.target.checked }))} className="w-4 h-4 accent-primary" />
          <label htmlFor="ahf" className="text-sm">After Hours</label>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Summary Notes</label>
          <textarea className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={form.summary_notes || ''} onChange={set('summary_notes')} />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => setEditing(false)} className="px-4 h-9 rounded-lg border border-border text-sm hover:bg-muted transition">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60">
          <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}