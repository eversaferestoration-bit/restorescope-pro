import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { mobileNavItems } from './navItems';

/**
 * Mobile navigation with tab-based stack preservation.
 * Each tab maintains its own navigation history via sessionStorage.
 */
export default function MobileNav() {
  const location = useLocation();

  // Preserve navigation stack per tab
  useEffect(() => {
    const tabPath = mobileNavItems.find(item => 
      location.pathname === item.path || location.pathname.startsWith(item.path)
    )?.path || '/dashboard';
    
    const storageKey = `nav_stack_${tabPath}`;
    const stack = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    
    if (!stack.includes(location.pathname)) {
      stack.push(location.pathname);
      sessionStorage.setItem(storageKey, JSON.stringify(stack.slice(-20))); // keep last 20
    }
  }, [location.pathname]);

  return (
    <nav className="lg:hidden border-t border-border bg-card safe-bottom shrink-0">
      <div className="flex items-center justify-around px-2 py-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const isNew = item.path === '/jobs/new';

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                // Clear nav stack only for /jobs/new to reset to create job
                if (item.path === '/jobs/new') {
                  sessionStorage.removeItem('nav_stack_/jobs');
                }
              }}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px] touch-target',
                isNew
                  ? 'relative'
                  : isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isNew ? (
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md -mt-4">
                  <Icon size={20} className="text-white" />
                </div>
              ) : (
                <Icon size={20} className={cn(isActive && 'stroke-[2.5px]')} />
              )}
              <span className={cn(
                'text-[10px] font-medium',
                isNew ? 'text-primary mt-0.5' : ''
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}