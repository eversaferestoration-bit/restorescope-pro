import { Users } from 'lucide-react';
import StepNav from './StepNav';

const ROLES = [
  { value: 'admin', label: 'Owner / Admin', desc: 'Full access to all features, users, and settings' },
  { value: 'manager', label: 'Manager', desc: 'Manage jobs, team, and approvals' },
  { value: 'estimator', label: 'Estimator', desc: 'Create and submit estimates for review' },
  { value: 'technician', label: 'Technician', desc: 'Field work, photos, and moisture readings' },
];

export default function Step3Role({ selectedRole, setRole, onBack, onContinue }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Users size={20} className="text-primary" />
      </div>
      <h2 className="text-xl font-semibold font-display mb-1">Your role</h2>
      <p className="text-sm text-muted-foreground mb-6">How will you primarily use RestoreScope Pro?</p>

      <div className="space-y-2.5">
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
              selectedRole === r.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30 hover:bg-muted'
            }`}
          >
            <div className={`font-semibold ${selectedRole === r.value ? 'text-primary' : ''}`}>{r.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
          </button>
        ))}
      </div>

      <StepNav
        onBack={onBack}
        onContinue={onContinue}
        disabled={!selectedRole}
      />
    </div>
  );
}