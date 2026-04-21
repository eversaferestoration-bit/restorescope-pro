import { AlertCircle } from 'lucide-react';

/**
 * Wraps optional dashboard widgets with graceful error boundary.
 * If widget crashes, shows brief error instead of crashing entire dashboard.
 */
export default function WidgetErrorBoundary({ children, label, hidden }) {
  if (hidden) {
    return null;
  }

  try {
    return children;
  } catch (error) {
    console.warn(`[WidgetErrorBoundary] ${label} widget crashed:`, error?.message);
    return (
      <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">Unable to load {label}</p>
      </div>
    );
  }
}