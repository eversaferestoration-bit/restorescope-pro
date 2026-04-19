import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const steps = [
  { id: 1, label: 'Company', description: 'Tell us about your company' },
  { id: 2, label: 'Role', description: 'What best describes your role?' },
  { id: 3, label: 'Plan', description: 'Choose how you want to get started' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ company_name: '', role: '', plan: '' });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFinish = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                step > s.id
                  ? 'bg-primary text-white'
                  : step === s.id
                  ? 'bg-primary text-white ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step > s.id ? '✓' : s.id}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-10 h-px ${step > s.id ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          {step === 1 && (
            <>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Building2 size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold font-display mb-1">Your company</h2>
              <p className="text-sm text-muted-foreground mb-6">This will appear on estimates and exports.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Company name</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={(e) => set('company_name')(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Acme Restoration LLC"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold font-display mb-1">Your role</h2>
              <p className="text-sm text-muted-foreground mb-6">How will you primarily use RestoreScope Pro?</p>
              <div className="space-y-2.5">
                {['Owner / Operator', 'Project Manager', 'Estimator', 'Field Technician'].map((r) => (
                  <button
                    key={r}
                    onClick={() => set('role')(r)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      form.role === r
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold font-display mb-1">Get started</h2>
              <p className="text-sm text-muted-foreground mb-6">Your account is ready. Let's go.</p>
              <div className="space-y-2.5">
                {['Free Trial (14 days)', 'Enter License Key', 'Subscribe Now'].map((p) => (
                  <button
                    key={p}
                    onClick={() => set('plan')(p)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      form.plan === p
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => step < 3 ? setStep(step + 1) : handleFinish()}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
            >
              {step === 3 ? 'Go to Dashboard' : 'Continue'}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}