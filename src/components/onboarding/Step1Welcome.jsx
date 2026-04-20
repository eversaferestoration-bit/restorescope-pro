import { Clock, CheckCircle2 } from 'lucide-react';

const STEPS_PREVIEW = [
  'Set up your company',
  'Confirm your role',
  'Choose default pricing',
  'Create your first job',
];

export default function Step1Welcome({ userName, onContinue }) {
  return (
    <div className="text-center">
      {/* Time badge */}
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full mb-5">
        <Clock size={11} /> Takes about 2 minutes
      </div>

      <h1 className="text-2xl font-bold font-display mb-2 leading-tight">
        {userName ? `Welcome, ${userName.split(' ')[0]}!` : "Let's get you set up"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
        We'll walk you through 4 quick steps to get your workspace ready.
      </p>

      {/* Steps preview */}
      <div className="text-left space-y-2 mb-7 max-w-xs mx-auto">
        {STEPS_PREVIEW.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
              {i + 1}
            </div>
            <span className="text-foreground/80">{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
      >
        Get started
      </button>
    </div>
  );
}