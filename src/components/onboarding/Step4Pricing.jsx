import { Tag, Zap } from 'lucide-react';
import StepNav from './StepNav';

export default function Step4Pricing({ pricingChoice, setPricingChoice, onBack, onContinue, loading }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Tag size={20} className="text-primary" />
      </div>
      <h2 className="text-xl font-semibold font-display mb-1">Default pricing</h2>
      <p className="text-sm text-muted-foreground mb-6">Choose your starting pricing setup. You can customize this anytime.</p>

      <div className="space-y-3">
        <button
          onClick={() => setPricingChoice('recommended')}
          className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all ${
            pricingChoice === 'recommended'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={15} className="text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">Use recommended defaults</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Industry-standard pricing for water, fire, and mold restoration — ready to go in one click.
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setPricingChoice('custom')}
          className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all ${
            pricingChoice === 'custom'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div>
            <div className="font-semibold text-sm">I'll set up my own pricing</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Start with a blank profile and add your own rates in Pricing Settings.
            </div>
          </div>
        </button>
      </div>

      <StepNav
        onBack={onBack}
        onContinue={onContinue}
        disabled={!pricingChoice}
        loading={loading}
        continueLabel={pricingChoice === 'recommended' ? 'Apply & Continue' : 'Continue'}
      />
    </div>
  );
}