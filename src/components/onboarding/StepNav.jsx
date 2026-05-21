import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function StepNav({ onBack, onNext, backLabel = 'Back', nextLabel = 'Next', disableNext = false }) {
  return (
    <div className="flex gap-3 pt-6 border-t border-border mt-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
      >
        <ChevronLeft size={18} /> {backLabel}
      </button>
      <button
        onClick={onNext}
        disabled={disableNext}
        className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:pointer-events-none"
      >
        {nextLabel} <ChevronRight size={18} />
      </button>
    </div>
  );
}