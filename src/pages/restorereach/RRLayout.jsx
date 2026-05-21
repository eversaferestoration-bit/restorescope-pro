import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Star, Zap, CloudLightning, PhoneCall, MapPin, TrendingUp,
  Settings, Building2, FileText, ScanLine, Users, Link2, Bot, BarChart2, Menu, X, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',      path: '/restorereach',             icon: LayoutDashboard, exact: true },
  { label: 'GBP Command',    path: '/restorereach/gbp',         icon: Building2 },
  { label: 'AI Content',     path: '/restorereach/content',     icon: FileText },
  { label: 'Review Engine',  path: '/restorereach/reviews',     icon: Star },
  { label: 'Storm Mode',     path: '/restorereach/storm',       icon: CloudLightning },
  { label: 'AI Damage Scan', path: '/restorereach/scan',        icon: ScanLine },
  { label: 'Lead Capture',   path: '/restorereach/leads',       icon: PhoneCall },
  { label: 'Service Areas',  path: '/restorereach/areas',       icon: MapPin },
  { label: 'Public Pages',   path: '/restorereach/pages',       icon: Globe },
  { label: 'Visibility',     path: '/restorereach/visibility',  icon: TrendingUp },
  { label: 'Competitors',    path: '/restorereach/competitors', icon: Users },
  { label: 'Citations',      path: '/restorereach/citations',   icon: Link2 },
  { label: 'Analytics',      path: '/restorereach/analytics',   icon: BarChart2 },
  { label: 'Automation',     path: '/restorereach/automation',  icon: Bot },
  { label: 'Settings',       path: '/restorereach/settings',    icon: Settings },
];

export default function RRLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item) => item.exact
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);

  return (
    <div className="flex h-full min-h-screen" style={{ background: '#0f1623' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r" style={{ borderColor: '#1e2d45', background: '#0d1829' }}>
        <div className="flex items-center gap-2.5 px-4 py-5 border-b" style={{ borderColor: '#1e2d45' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#e05a1c' }}>
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">RestoreReach</p>
            <p className="text-xs leading-tight" style={{ color: '#e05a1c' }}>AI Marketing</p>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path}>
                <div className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                )} style={active ? { background: '#e05a1c' } : {}}>
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

      {/* ── Mobile Drawer Overlay ────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          {/* Drawer */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full border-r z-10" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            <div className="flex items-center justify-between px-4 py-5 border-b" style={{ borderColor: '#1e2d45' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e05a1c' }}>
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-tight">RestoreReach</p>
                  <p className="text-xs leading-tight" style={{ color: '#e05a1c' }}>AI Marketing</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
              {NAV.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px]',
                      active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )} style={active ? { background: '#e05a1c' } : {}}>
                      <Icon size={17} className="shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Mobile Top Bar ───────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 border-b" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#e05a1c' }}>
            <Zap size={12} className="text-white" />
          </div>
          <span className="text-white text-sm font-bold">RestoreReach AI</span>
        </div>
        {/* Current page indicator */}
        <div className="ml-auto">
          {NAV.map((item) => {
            if (!isActive(item)) return null;
            const Icon = item.icon;
            return (
              <div key={item.path} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: '#e05a1c22' }}>
                <Icon size={12} style={{ color: '#e05a1c' }} />
                <span style={{ color: '#e05a1c' }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden lg:pt-0 pt-14 min-w-0" style={{ background: '#0f1623' }}>
        <Outlet />
      </main>
    </div>
  );
}