import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import InsuredSelector from '@/components/job/InsuredSelector';
import PropertySelector from '@/components/job/PropertySelector';
import UserSelector from '@/components/job/UserSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const LOSS_TYPES = [
  { value: 'water', label: 'Water' },
  { value: 'mold', label: 'Mold' },
];

const SERVICE_TYPES = ['Water Mitigation', 'Mold Remediation', 'Inspection Only'];
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'approved', 'closed'];
const STEPS = ['Job Info', 'Insured & Property', 'Assignment', 'Review'];

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

function generateJobNumber() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RSP-${date}-${rand}`;
}

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

export default function NewJob() {
  const navigate = useNavigate();
  const { user, userProfile, refreshUserProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

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

  const ensureCompanyId = async () => {
    let companyId =
      userProfile?.company_id ||
      user?.company_id ||
      insured?.company_id ||
      property?.company_id ||
      '';

    if (companyId) return companyId;

    const email = user?.email || '';

    const existingCompanies = await base44.entities.Company.filter({
      created_by: email,
      is_deleted: false,
    });

    if (existingCompanies?.length > 0) {
      companyId = existingCompanies[0].id;
    } else {
      const company = await base44.entities.Company.create({
        name: 'Eversafe Restoration',
        phone: '636-219-9302',
        email,
        website: 'https://eversafepro.com',
        city: 'St. Louis',
        state: 'MO',
        service_area: 'St. Louis, MO and surrounding areas; Alton, IL and surrounding areas',
        status: 'active',
        created_by: email,
        is_deleted: false,
      });

      companyId = company.id;
    }

    if (userProfile?.id && companyId) {
      await base44.entities.UserProfile.update(userProfile.id, {
        company_id: companyId,
        email,
        is_deleted: false,
      });

      if (refreshUserProfile) await refreshUserProfile();
    }

    return companyId;
  };

  const validate = (currentStep) => {
    const nextErrors = {};

    if (currentStep === 0) {
      if (!form.loss_type) nextErrors.loss_type = 'Loss type is required.';
      if (!form.service_type) nextErrors.service_type = 'Service type is required.';
    }

    if (currentStep === 1) {
      if (!insured) nextErrors.insured = 'Insured is required.';
      if (!property) nextErrors.property = 'Property is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (validate(step)) setStep((current) => current + 1);
  };

  const back = () => {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
  };

  const handleSubmit = async () => {
    if (!validate(step)) return;

    setSaving(true);
    setSubmitError('');

    try {
      const companyId = await ensureCompanyId();

      if (!companyId) {
        setSubmitError('Missing company profile. Save company profile first.');
        setSaving(false);
        return;
      }

      const jobPayload = {
        ...form,
        company_id: companyId,
        insured_id: insured?.id || '',
        property_id: property?.id || '',
        assigned_manager_id: assignedManagerId || '',
        assigned_estimator_id: assignedEstimatorId || '',
        created_by: user?.email || '',
        is_deleted: false,
      };

      const createdJob = await base44.entities.Job.create(jobPayload);

      const cachedJob = {
        ...jobPayload,
        ...createdJob,
        id: createdJob.id,
      };

      try {
        sessionStorage.setItem(`job_cache_${createdJob.id}`, JSON.stringify(cachedJob));
        sessionStorage.setItem('last_created_job_id', createdJob.id);
      } catch {}

      navigate(`/jobs/${createdJob.id}`, {
        replace: true,
        state: { job: cachedJob },
      });
    } catch (error) {
      console.error('[NewJob] Failed to create job:', error?.message || error);
      setSubmitError('Failed to create job. Check Job entity permissions and company_id linkage.');
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

      <StepIndicator steps={STEPS} current={step} />

      {step === 0 && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <Field label="Job Number">
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

          <Field label="Loss Type" required error={errors.loss_type}>
            <Select value={form.loss_type} onValueChange={(value) => setForm((current) => ({ ...current, loss_type: value }))}>
              <SelectTrigger className="min-h-touch">
                <SelectValue placeholder="Select loss type" />
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
              <SelectTrigger className="min-h-touch">
                <SelectValue placeholder="Select service type" />
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
                <SelectValue placeholder="Select status" />
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

          <Field label="Cause of Loss">
            <input className={inputCls} value={form.cause_of_loss} onChange={set('cause_of_loss')} placeholder="Brief description" />
          </Field>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.emergency_flag}
                onChange={(event) => setForm((current) => ({ ...current, emergency_flag: event.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">Emergency</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.after_hours_flag}
                onChange={(event) => setForm((current) => ({ ...current, after_hours_flag: event.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">After Hours</span>
            </label>
          </div>

          <Field label="Summary Notes">
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              value={form.summary_notes}
              onChange={set('summary_notes')}
              placeholder="Initial notes"
            />
          </Field>
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
            <div className="flex justify-between"><span className="text-xs text-muted-foreground">Job Number</span><span className="text-sm font-medium">{form.job_number}</span></div>
            <div className="flex justify-between"><span className="text-xs text-muted-foreground">Loss Type</span><span className="text-sm font-medium">{form.loss_type}</span></div>
            <div className="flex justify-between"><span className="text-xs text-muted-foreground">Service Type</span><span className="text-sm font-medium">{form.service_type}</span></div>
            <div className="flex justify-between"><span className="text-xs text-muted-foreground">Insured</span><span className="text-sm font-medium">{insured?.full_name || insured?.name}</span></div>
            <div className="flex justify-between"><span className="text-xs text-muted-foreground">Property</span><span className="text-sm font-medium">{property?.address_line_1}</span></div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mt-4 px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {submitError}
        </div>
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