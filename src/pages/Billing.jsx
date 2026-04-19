import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Billing() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and payment details</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Current Plan</p>
            <p className="text-xs text-muted-foreground">Free Trial</p>
          </div>
        </div>
        <div className="bg-muted rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Subscription management will be available once a plan is selected.</p>
        </div>
        <div className="mt-4">
          <Link
            to="/pricing-profiles"
            className="inline-flex items-center px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}