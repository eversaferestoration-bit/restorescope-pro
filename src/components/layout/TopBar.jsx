import { Menu, Bell, Settings, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function TopBar({ onMenuClick, userInitials, userName }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      {/* Left: Menu Toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Menu size={20} className="text-foreground" />
      </button>

      {/* Center: Logo/Brand (optional) */}
      <div className="hidden sm:flex items-center flex-1 ml-4 lg:ml-0">
        <h1 className="text-lg font-bold text-foreground">RestoreScope Pro</h1>
      </div>

      {/* Right: User Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
          <Bell size={20} className="text-foreground" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </button>

        <div className="hidden sm:block h-6 w-px bg-border" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{userInitials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-foreground">
                <User size={16} /> Profile
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-foreground">
                <Settings size={16} /> Settings
              </button>
              <div className="border-t border-border" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-destructive"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}