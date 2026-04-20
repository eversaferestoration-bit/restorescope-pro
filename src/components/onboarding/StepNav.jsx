import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function StepNav({ onBack, onContinue, continueLabel = 'Continue', disabled = false, loading = false, showBack = true }) {
  return (
    <div className={`flex mt-8 ${showBack ? 'justify-between' : 'justify-end'}`}>
      {showBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}
      <button
        onClick={onContinue}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : null}
        {continueLabel}
        {!loading && <ArrowRight size={14} />}
      </button>
    </div>
  );
}