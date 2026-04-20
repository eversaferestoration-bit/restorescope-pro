import { Link } from 'react-router-dom';
import { Lock, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Modal shown when user with expired beta tries a restricted action.
 * Prevents bypass but doesn't crash or block entire UI.
 */
export default function UpgradeRequiredModal({ action, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-100 mx-auto mb-3 flex items-center justify-center">
            <Lock size={24} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold font-display mb-2">Upgrade Required</h2>
          <p className="text-sm text-muted-foreground">
            Your trial has ended. {action ? `${action} requires` : 'Continue using'} an active plan.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/billing"
            onClick={onClose}
            className="block w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            <Zap size={14} /> View Plans & Upgrade
          </Link>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Your data is safe. Upgrade anytime to resume.
        </p>
      </div>
    </div>
  );
}