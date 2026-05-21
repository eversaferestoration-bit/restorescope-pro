import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Star, Zap, CloudLightning, PhoneCall, MapPin, TrendingUp,
  Settings, Building2, FileText, ScanLine, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard', path: '/restorereach', icon: LayoutDashboard, exact: true },
  { label: 'GBP Command', path: '/restorereach/gbp', icon: Building2 },
  { label: 'AI Content', path: '/restorereach/content', icon: FileText },
  { label: 'Review Engine', path: '/restorereach/reviews', icon: Star },
  { label: 'Storm Mode', path: '/restorereach/storm', icon: CloudLightning },
  { label: 'AI Damage Scan', path: '/restorereach/scan', icon: ScanLine },
  { label: 'Lead Capture', path: '/restorereach/leads', icon: PhoneCall },
  { label: 'Service Areas', path: '/restorereach/areas', icon: MapPin },
  { label: 'Visibility Score', path: '/restorereach/visibility', icon: TrendingUp },
  { label: 'Competitors', path: '/restorereach/competitors', icon: Users },
  { label: 'Settings', path: '/restorereach/settings', icon: Settings },
];

export default function RRLayout() {
  const location = useLocation();

  return (
    <div className="flex h-full min-h-screen" style={{ background: '#0f1623' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r" style={{ borderColor: '#1e2d45', background: '#0d1829' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b" style={{ borderColor: '#1e2d45' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#e05a1c' }}>
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">RestoreReach</p>
            <p className="text-xs leading-tight" style={{ color: '#e05a1c' }}>AI Marketing</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path}>
                <div className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
                  style={isActive ? { background: '#e05a1c' } : {}}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t" style={{ borderColor: '#1e2d45' }}>
          <p className="text-xs px-2" style={{ color: '#3a5a7c' }}>RestoreReach AI v1.0</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-4 py-3 border-b" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e05a1c' }}>
          <Zap size={14} className="text-white" />
        </div>
        <span className="text-white text-sm font-bold">RestoreReach AI</span>
        <div className="ml-auto flex gap-0.5 overflow-x-auto no-scrollbar">
          {NAV.map((item) => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path}>
                <div className={cn('p-1.5 rounded-lg shrink-0', isActive ? 'text-white' : 'text-slate-400')}
                  style={isActive ? { background: '#e05a1c' } : {}}>
                  <Icon size={15} />
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14" style={{ background: '#0f1623' }}>
        <Outlet />
      </main>
    </div>
  );
}