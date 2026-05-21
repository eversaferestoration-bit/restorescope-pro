// Mobile-first responsive utilities and hooks for touch-friendly interfaces
import { useEffect, useState } from 'react';

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Touch-friendly button wrapper for mobile
export function TouchButton({ children, className = '', ...props }) {
  return (
    <button
      className={`min-h-[44px] min-w-[44px] rounded-lg transition-all active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Mobile-optimized form input
export function MobileInput({ label, error, ...props }) {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
      <input
        className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-input bg-transparent text-base focus:ring-2 focus:ring-primary"
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Mobile-optimized card
export function MobileCard({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}