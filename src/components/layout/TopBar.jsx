import { useLocation } from 'react-router-dom';
import { Droplets, Bell } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/jobs': 'Jobs',
  '/jobs/new': 'New Job',
  '/settings': 'Settings',
  '/billing': 'Billing',
  '/users': 'Team',
  '/templates': 'Templates',
  '/pricing-profiles': 'Pricing Profiles',
  '/audit-log': 'Audit Log',
};

function getPageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/jobs/')) return 'Job Detail';
  return 'RestoreScope Pro';
}

export default function TopBar() {
  const location = useLocation();
  const { user } = useAuth();
  const title = getPageTitle(location.pathname);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'RS';

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Droplets size={14} className="text-white" />
        </div>
      </div>

      <h1 className="text-base font-semibold font-display flex-1 lg:flex-none">{title}</h1>

      <div className="flex-1 hidden lg:block" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell size={17} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary/20 transition-colors">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}