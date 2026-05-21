import { NavLink } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const MAIN_NAV = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard' },
  { label: 'Jobs', icon: '🛠️', path: '/jobs' },
  { label: 'CRM', icon: '👥', path: '/crm' },
  { label: 'RestoreReach AI', icon: '✨', path: '/restorereach' },
];

const SECONDARY_NAV = [
  { label: 'Settings', icon: '⚙️', path: '/settings' },
  { label: 'Users', icon: '👨‍💼', path: '/users' },
  { label: 'Billing', icon: '💳', path: '/billing' },
];

export default function Sidebar({ isOpen, onClose }) {
  const [expandedGroup, setExpandedGroup] = useState(null);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-6">
          <h1 className="text-lg font-bold text-foreground">RestoreScope</h1>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Main Navigation */}
          <div className="mb-6">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Main
            </p>
            <div className="space-y-1">
              {MAIN_NAV.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                    )
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Secondary Navigation */}
          <div>
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Admin
            </p>
            <div className="space-y-1">
              {SECONDARY_NAV.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                    )
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="px-3 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Version 1.0</p>
            <p>Enterprise SaaS Platform</p>
          </div>
        </div>
      </aside>
    </>
  );
}