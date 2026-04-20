import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Unified mobile header component.
 * - Displays back button for child routes (anything beyond root)
 * - Shows logo/title for root routes
 * - Applies safe-top padding
 */
export default function MobileHeader({ title, showBack = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we should show back button (any non-root route)
  const isRootRoute = location.pathname === '/dashboard' || location.pathname === '/';
  const showBackButton = showBack && !isRootRoute;

  return (
    <div className="safe-top bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 h-14">
        {showBackButton ? (
          <button
            onClick={() => navigate(-1)}
            className="touch-target text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Droplets size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold font-display">RestoreScope</span>
          </div>
        )}

        {title && (
          <h1 className={cn(
            'text-sm font-semibold font-display flex-1 text-center',
            showBackButton ? 'mr-8' : 'hidden'
          )}>
            {title}
          </h1>
        )}

        {!showBackButton && (
          <div className="w-7" /> // Spacer for centering
        )}
      </div>
    </div>
  );
}