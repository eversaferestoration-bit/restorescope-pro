import { PartyPopper, FolderPlus } from 'lucide-react';

export default function Step5FirstJob({ onBack, onSkip, onCreateJob }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
        <PartyPopper size={28} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold font-display mb-2">Your workspace is ready</h2>
      <p className="text-sm text-muted-foreground mb-7 max-w-xs mx-auto">
        Create your first job now — it takes under a minute.
      </p>

      <button
        onClick={onCreateJob}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2 mb-3"
      >
        <FolderPlus size={16} /> Create my first job
      </button>

      <button
        onClick={onSkip}
        className="w-full h-9 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
      >
        Skip for now
      </button>

      <button
        onClick={onBack}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition"
      >
        ← Back
      </button>
    </div>
  );
}