import { useDemo } from '@/lib/DemoContext';
import { FlaskConical, X } from 'lucide-react';

export default function DemoBanner() {
  const { isDemo, exitDemo } = useDemo();
  if (!isDemo) return null;

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-white text-sm font-medium">
      <div className="flex items-center gap-2">
        <FlaskConical size={15} className="shrink-0" />
        <span>Demo Mode — you're viewing sample data. No changes are saved.</span>
      </div>
      <button
        onClick={exitDemo}
        className="inline-flex items-center gap-1.5 px-3 h-7 rounded-md bg-white/20 hover:bg-white/30 transition text-xs font-semibold whitespace-nowrap"
      >
        <X size={12} /> Exit Demo
      </button>
    </div>
  );
}