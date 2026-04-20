const STEPS = ['Company', 'Role', 'Pricing', 'First Job'];

export default function OnboardingProgressBar({ currentStep, totalSteps = 4 }) {
  const pct = Math.min(((currentStep - 1) / (totalSteps - 1)) * 100, 100);

  return (
    <div className="mb-6">
      {/* Step labels */}
      <div className="flex justify-between mb-2">
        {STEPS.map((label, i) => {
          const sNum = i + 1;
          const done = currentStep > sNum;
          const active = currentStep === sNum;
          return (
            <div key={label} className="flex flex-col items-center gap-1" style={{ width: `${100 / STEPS.length}%` }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                done ? 'bg-primary text-primary-foreground' :
                active ? 'bg-primary text-primary-foreground ring-[3px] ring-primary/25' :
                'bg-muted text-muted-foreground'
              }`}>
                {done ? '✓' : sNum}
              </div>
              <span className={`text-[9px] font-medium leading-tight text-center hidden sm:block ${
                active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'
              }`}>{label}</span>
            </div>
          );
        })}
      </div>
      {/* Bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}