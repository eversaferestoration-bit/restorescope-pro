import { FolderPlus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StepNav from './StepNav';

export default function Step5FirstJob({ onBack, onSkip, onCreateJob }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
        <FolderPlus size={28} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold font-display mb-2">You're almost there!</h2>
      <p className="text-sm text-muted-foreground mb-2">Your workspace is configured.</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
        Create your first job to see the full power of RestoreScope Pro — or skip and explore the dashboard first.
      </p>

      <div className="space-y-3">
        <button
          onClick={onCreateJob}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
        >
          <FolderPlus size={16} /> Create my first job
        </button>
        <button
          onClick={onSkip}
          className="w-full h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition"
        >
          Skip for now — go to dashboard
        </button>
      </div>

      <button
        onClick={onBack}
        className="mt-4 text-xs text-muted-foreground hover:text-foreground transition"
      >
        ← Back
      </button>
    </div>
  );
}