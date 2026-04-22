import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldOff size={26} className="text-destructive" />
      </div>
      <h1 className="text-2xl font-bold font-display mb-2">Access Denied</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        You don't have permission to view this page. Contact your administrator if you think this is a mistake.
      </p>
      <div className="flex gap-3">
        <Link
          to="/dashboard"
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/login"
          className="h-10 px-5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition flex items-center"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}