import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NewJob() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">New Job</h1>
        <p className="text-sm text-muted-foreground mt-1">Start a new restoration job</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-sm text-muted-foreground">
          Job intake form will be built in the next step.
        </p>
      </div>
    </div>
  );
}