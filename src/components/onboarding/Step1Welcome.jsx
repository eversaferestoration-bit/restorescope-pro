import { Droplets, Sparkles } from 'lucide-react';
import StepNav from './StepNav';

export default function Step1Welcome({ userName, onContinue }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
        <Droplets size={28} className="text-white" />
      </div>
      <h1 className="text-2xl font-bold font-display mb-2">
        {userName ? `Welcome, ${userName.split(' ')[0]}!` : 'Welcome!'}
      </h1>
      <p className="text-base text-muted-foreground mb-2">
        Let's get your company set up
      </p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        This takes about 2 minutes. We'll walk you through everything step by step.
      </p>
      <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground max-w-xs mx-auto">
        {['Set up your company', 'Confirm your role', 'Configure pricing', 'Create your first job'].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={10} className="text-primary" />
            </div>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button
          onClick={onContinue}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}