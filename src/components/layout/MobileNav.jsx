import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { mobileNavItems } from './navItems';

export default function MobileNav() {
  const location = useLocation();

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
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px]',
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