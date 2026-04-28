import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { logAction } from '@/lib/auditLog';
import UpgradeNudge from '@/components/trial/UpgradeNudge';
import { useUpgradeTrigger } from '@/hooks/useUpgradeTrigger';
import { useBetaAccess } from '@/hooks/useBetaAccess';
import UpgradeRequiredModal from '@/components/trial/UpgradeRequiredModal';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import InsuredSelector from '@/components/job/InsuredSelector';
import PropertySelector from '@/components/job/PropertySelector';
import UserSelector from '@/components/job/UserSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const LOSS_TYPES = [
  { value: 'water', label: 'Water' },
  { value: 'mold', label: 'Mold' },
  { value: 'fire', label: 'Fire' },
  { value: 'mixed_loss', label: 'Mixed Loss' },
];

const SERVICE_TYPES = ['Mitigation', 'Restoration', 'Contents', 'Reconstruction', 'Inspection Only'];
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'approved', 'closed'];
const STEPS = ['Job Info', 'Insured & Property', 'Assignment', 'Review'];

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all',
              i < current
                ? 'bg-primary text-white'
                : i === current
                  ? 'bg-primary text-white ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {i < current ? <Check size={13} /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-px transition-colors', i < current ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  );
}

function generateJobNumber() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RSP-${date}-${rand}`;
}

export default function NewJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nudge = useUpgradeTrigger({ feature: 'estimate', checkLimits: true });
  const { isBlockedByExpiredBeta } = useBetaAccess();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [form, setForm] = useState({
    job_number: generateJobNumber(),
    loss_type: '',
    service_type: '',
    cause_of_loss: '',
    status: 'new',
    date_of_loss: '',
    inspection_date: '',
    emergency_flag: false,
    after_hours_flag: false,
    summary_notes: '',
  });

  const [insured, setInsured] = useState(null);
  const [property, setProperty] = useState(null);
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [assignedEstimatorId, setAssignedEstimatorId] = useState('');

  const set = (key) => (eventOrValue) => {
    const value = eventOrValue?.target?.value ?? eventOrValue;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = (currentStep) => {
    const nextErrors = {};

    if (!user?.company_id) {
      nextErrors.company = 'Your account is not linked to a company. Complete company setup first.';
    }

    if (currentStep === 0) {
      if (!form.loss_type) nextErrors.loss_type = 'Loss type is required.';
      if (!form.service_type) nextErrors.service_type = 'Service type is required.';
      if (!form.job_number?.trim()) nextErrors.job_number = 'Job number is required.';
    }

    if (currentStep === 1) {
      if (!insured?.id) nextErrors.insured = 'Save or select an insured before continuing.';
      if (!property?.id) nextErrors.property = 'Save or select a property before continuing.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (validate(step)) {
      setSubmitError('');
      setStep((current) => current + 1);
    }
  };

  const back = () => {
    setErrors({});
    setSubmitError('');
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    if (isBlockedByExpiredBeta) {
      setShowUpgradeModal(true);
      return;
    }

    if (!validate(1) || !validate(3)) return;

    setSaving(true);
    setSubmitError('');

    try {
      if (!user?.company_id) {
        throw new Error('Missing company profile. Complete company setup before creating jobs.');
      }

      if (!insured?.id) {
        throw new Error('Insured was not saved correctly. Save or select an insured again.');
      }

      if (!property?.id) {
        throw new Error('Property was not saved correctly. Save or select a property again.');
      }

      const cleanForm = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value === '' ? null : value])
      );

      const jobPayload = {
        ...cleanForm,
        insured_id: insured.id,
        property_id: property.id,
        claim_id: null,
        assigned_manager_id: assignedManagerId || null,
        assigned_estimator_id: assignedEstimatorId || null,
        company_id: user.company_id,
        created_by: user.email || user.id || null,
        is_deleted: false,
      };

      const job = await base44.entities.Job.create(jobPayload);

      await logAction(user, 'Job', job.id, 'created', `Job ${job.job_number} created`, {
        loss_type: job.loss_type,
        service_type: job.service_type,
        insured_id: insured.id,
        property_id: property.id,
        company_id: user.company_id,
      }).catch(() => null);

      navigate(`/jobs/${job.id}`);
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create job. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <button
        onClick={() => (step === 0 ? navigate(-1) : back())}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition"
      >
        <ArrowLeft size={15} /> {step === 0 ? 'Back' : 'Previous'}
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold font-display">New Job</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>

      {nudge && <UpgradeNudge {...nudge} className="mb-4" />}

      <StepIndicator steps={STEPS} current={step} />

      {errors.company && (
        <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {errors.company}
        </div>
      )}

      {step === 0 && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Job Number" required error={errors.job_number}>
                <div className="flex gap-2">
                  <input className={inputCls} value={form.job_number} onChange={set('job_number')} />
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, job_number: generateJobNumber() }))}
                    className="h-10 px-3 rounded-lg border border-border text-xs hover:bg-muted transition whitespace-nowrap"
                  >
                    Regenerate
                  </button>
                </div>
              </Field>
            </div>

            <Field label="Loss Type" required error={errors.loss_type}>
              <Select value={form.loss_type} onValueChange={(value) => setForm((current) => ({ ...current, loss_type: value }))}>
                <SelectTrigger className={cn('min-h-touch', errors.loss_type && 'border-destructive')}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {LOSS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Service Type" required error={errors.service_type}>
              <Select value={form.service_type} onValueChange={(value) => setForm((current) => ({ ...current, service_type: value }))}>
                <SelectTrigger className={cn('min-h-touch', errors.service_type && 'border-destructive')}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status">
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger className="min-h-touch">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Date of Loss">
              <input type="date" className={inputCls} value={form.date_of_loss} onChange={set('date_of_loss')} />
            </Field>

            <Field label="Inspection Date">
              <input type="date" className={inputCls} value={form.inspection_date} onChange={set('inspection_date')} />
            </Field>

            <div className="col-span-2">
              <Field label="Cause of Loss">
                <input className={inputCls} value={form.cause_of_loss} onChange={set('cause_of_loss')} placeholder="Brief description…" />
              </Field>
            </div>

            <div className="col-span-2 flex gap-6">
              {[
                { key: 'emergency_flag', label: 'Emergency' },
                { key: 'after_hours_flag', label: 'After Hours' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            <div className="col-span-2">
              <Field label="Summary Notes">
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  value={form.summary_notes}
                  onChange={set('summary_notes')}
                  placeholder="Initial notes…"
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold font-display">
                Insured <span className="text-destructive">*</span>
              </h2>
              {errors.insured && <p className="text-xs text-destructive">{errors.insured}</p>}
            </div>
            <InsuredSelector value={insured} onChange={setInsured} />
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold font-display">
                Property <span className="text-destructive">*</span>
              </h2>
              {errors.property && <p className="text-xs text-destructive">{errors.property}</p>}
            </div>
            <PropertySelector value={property} onChange={setProperty} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide">
            Assign Team
          </h2>
          <UserSelector label="Project Manager" value={assignedManagerId} onChange={setAssignedManagerId} />
          <UserSelector label="Estimator" value={assignedEstimatorId} onChange={setAssignedEstimatorId} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-semibold font-display">Job Summary</h2>
            {[
              ['Job Number', form.job_number],
              ['Loss Type', LOSS_TYPES.find((type) => type.value === form.loss_type)?.label],
              ['Service Type', form.service_type],
              ['Status', form.status?.replace(/_/g, ' ')],
              ['Date of Loss', form.date_of_loss],
              ['Inspection Date', form.inspection_date],
              ['Cause of Loss', form.cause_of_loss],
              ['Emergency', form.emergency_flag ? 'Yes' : 'No'],
              ['After Hours', form.after_hours_flag ? 'Yes' : 'No'],
            ].map(([label, value]) =>
              value ? (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className="text-sm font-medium text-right">{value}</span>
                </div>
              ) : null
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-2">
            <h2 className="text-sm font-semibold font-display">Insured & Property</h2>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Insured</span>
              <span className="text-sm font-medium">{insured?.full_name || insured?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Property</span>
              <span className="text-sm font-medium text-right max-w-[60%]">
                {property ? [property.address_line_1, property.city, property.state].filter(Boolean).join(', ') : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mt-4 px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {submitError}
        </div>
      )}

      {showUpgradeModal && (
        <UpgradeRequiredModal action="Creating new jobs" onClose={() => setShowUpgradeModal(false)} />
      )}

      <div className="flex justify-between mt-5 gap-3">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate(-1) : back())}
          className="px-4 min-h-touch rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-2 px-5 min-h-touch rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
          >
            Next <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 min-h-touch rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            <Save size={15} /> {saving ? 'Creating…' : 'Create Job'}
          </button>
        )}
      </div>
    </div>
  );
}