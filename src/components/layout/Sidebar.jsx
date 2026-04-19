import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { primaryNavItems, secondaryNavItems, settingsNavItems } from './navItems';
import { Droplets } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function NavItem({ item, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-slate-300 hover:bg-white/8 hover:text-white'
      )}
    >
      <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavSection({ title, items }) {
  return (
    <div className="space-y-0.5">
      {title && (
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-1">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavItem key={item.path} item={item} />
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const filteredSecondary = secondaryNavItems.filter((i) => !i.adminOnly || isAdmin);
  const filteredSettings = settingsNavItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen overflow-y-auto"
      style={{ background: 'hsl(220, 22%, 13%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b"
        style={{ borderColor: 'hsl(220, 16%, 20%)' }}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Droplets size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold font-display leading-tight">RestoreScope</p>
          <p className="text-slate-400 text-xs leading-tight">Pro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <NavSection items={primaryNavItems} />
        <NavSection title="Manage" items={filteredSecondary} />
        <NavSection title="Account" items={filteredSettings} />
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'hsl(220, 16%, 20%)' }}>
        <p className="text-xs text-slate-500 px-3">RestoreScope Pro v1.0</p>
      </div>
    </aside>
  );
}