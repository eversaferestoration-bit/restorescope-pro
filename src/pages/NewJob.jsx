import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const LOSS_TYPES = ['Water', 'Fire', 'Mold', 'Storm', 'Wind', 'Smoke', 'Biohazard', 'Other'];
const SERVICE_TYPES = ['Mitigation', 'Restoration', 'Contents', 'Reconstruction', 'Inspection Only'];
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'approved', 'closed'];
const COMPLEXITY = ['Low', 'Medium', 'High', 'Complex'];
const ACCESS_DIFF = ['Easy', 'Moderate', 'Difficult', 'Restricted'];

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';
const selectCls = 'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

export default function NewJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    job_number: '',
    loss_type: '',
    service_type: '',
    cause_of_loss: '',
    status: 'new',
    date_of_loss: '',
    inspection_date: '',
    emergency_flag: false,
    after_hours_flag: false,
    complexity_level: '',
    access_difficulty: '',
    summary_notes: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const job = await base44.entities.Job.create({
      ...form,
      company_id: user?.company_id || 'default',
      created_by: user?.email,
      is_deleted: false,
    });
    navigate(`/jobs/${job.id}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">New Job</h1>
        <p className="text-sm text-muted-foreground mt-1">Start a new restoration job</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Job Number">
              <input className={inputCls} value={form.job_number} onChange={set('job_number')} placeholder="e.g. JOB-2024-001" />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
            <Field label="Loss Type" required>
              <select className={selectCls} value={form.loss_type} onChange={set('loss_type')} required>
                <option value="">Select…</option>
                {LOSS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Service Type">
              <select className={selectCls} value={form.service_type} onChange={set('service_type')}>
                <option value="">Select…</option>
                {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Date of Loss">
              <input type="date" className={inputCls} value={form.date_of_loss} onChange={set('date_of_loss')} />
            </Field>
            <Field label="Inspection Date">
              <input type="date" className={inputCls} value={form.inspection_date} onChange={set('inspection_date')} />
            </Field>
            <Field label="Complexity">
              <select className={selectCls} value={form.complexity_level} onChange={set('complexity_level')}>
                <option value="">Select…</option>
                {COMPLEXITY.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Access Difficulty">
              <select className={selectCls} value={form.access_difficulty} onChange={set('access_difficulty')}>
                <option value="">Select…</option>
                {ACCESS_DIFF.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Cause of Loss">
            <input className={inputCls} value={form.cause_of_loss} onChange={set('cause_of_loss')} placeholder="Brief description of the cause" />
          </Field>
        </div>

        {/* Flags */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide">Flags</h2>
          {[
            { key: 'emergency_flag', label: 'Emergency', desc: 'Requires immediate response' },
            { key: 'after_hours_flag', label: 'After Hours', desc: 'Job occurred outside normal hours' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-input accent-primary"
              />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-card rounded-xl border border-border p-5">
          <Field label="Summary Notes">
            <textarea
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"
              rows={3}
              value={form.summary_notes}
              onChange={set('summary_notes')}
              placeholder="Initial notes about the job…"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <Save size={15} /> {saving ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
}