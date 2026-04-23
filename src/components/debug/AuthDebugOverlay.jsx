/**
 * AuthDebugOverlay — visible auth diagnostics panel.
 * Only renders when localStorage.getItem('auth_debug') === 'true'
 * or URL has ?auth_debug=true
 *
 * To enable: open browser console and run:
 *   localStorage.setItem('auth_debug', 'true'); location.reload();
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

function isDebugEnabled() {
  try {
    return (
      localStorage.getItem('auth_debug') === 'true' ||
      new URLSearchParams(window.location.search).get('auth_debug') === 'true'
    );
  } catch {
    return false;
  }
}

export default function AuthDebugOverlay() {
  const { user, userProfile, isLoadingAuth, isAuthenticated, authError, needsOnboarding } = useAuth();
  const [enabled] = useState(isDebugEnabled);
  const [token, setToken] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!enabled) return;
    try {
      const t = localStorage.getItem('base44_access_token') || '(none)';
      setToken(t.length > 20 ? t.slice(0, 20) + '…' : t);
    } catch {
      setToken('(error reading)');
    }
  });

  // Capture auth state changes as event log
  useEffect(() => {
    if (!enabled) return;
    const entry = {
      ts: new Date().toISOString().slice(11, 23),
      isLoadingAuth,
      isAuthenticated,
      userId: user?.id?.slice(-8) || null,
      profileId: userProfile?.id?.slice(-8) || null,
      onboardingStatus: userProfile?.onboarding_status || null,
      companyId: userProfile?.company_id?.slice(-8) || null,
      authError: authError?.type || null,
      needsOnboarding,
    };
    setEvents(prev => [entry, ...prev].slice(0, 20));
  }, [isLoadingAuth, isAuthenticated, user?.id, userProfile?.id, authError?.type, needsOnboarding]);

  if (!enabled) return null;

  const rowCls = 'flex justify-between gap-2 py-0.5 border-b border-white/10 text-[10px]';
  const labelCls = 'text-white/50 shrink-0';
  const valCls = (ok) => ok ? 'text-green-400 font-mono' : 'text-red-400 font-mono';

  return (
    <div
      style={{ position: 'fixed', bottom: 8, left: 8, zIndex: 9999, maxWidth: 340, fontFamily: 'monospace' }}
      className="bg-black/90 text-white rounded-xl shadow-2xl overflow-hidden text-xs"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-white/10 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <span className="font-bold text-yellow-400">🔐 Auth Debug</span>
        <span className="text-white/50">{collapsed ? '▲ show' : '▼ hide'}</span>
      </div>

      {!collapsed && (
        <div className="px-3 py-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {/* Current state */}
          <div className="text-white/40 uppercase text-[9px] tracking-wide pt-1">Current State</div>
          <div className={rowCls}><span className={labelCls}>isLoadingAuth</span><span className={valCls(!isLoadingAuth)}>{String(isLoadingAuth)}</span></div>
          <div className={rowCls}><span className={labelCls}>isAuthenticated</span><span className={valCls(isAuthenticated)}>{String(isAuthenticated)}</span></div>
          <div className={rowCls}><span className={labelCls}>user.id</span><span className={valCls(!!user)}>{user?.id?.slice(-8) || 'null'}</span></div>
          <div className={rowCls}><span className={labelCls}>user.email</span><span className="text-blue-300 font-mono text-[10px] truncate max-w-[180px]">{user?.email || 'null'}</span></div>
          <div className={rowCls}><span className={labelCls}>profile.id</span><span className={valCls(!!userProfile)}>{userProfile?.id?.slice(-8) || 'null'}</span></div>
          <div className={rowCls}><span className={labelCls}>onboarding</span><span className="text-purple-300 font-mono">{userProfile?.onboarding_status || 'null'}</span></div>
          <div className={rowCls}><span className={labelCls}>company_id</span><span className={valCls(!!userProfile?.company_id)}>{userProfile?.company_id?.slice(-8) || 'null'}</span></div>
          <div className={rowCls}><span className={labelCls}>needsOnboarding</span><span className={valCls(!needsOnboarding)}>{String(needsOnboarding)}</span></div>
          <div className={rowCls}><span className={labelCls}>authError</span><span className={valCls(!authError)}>{authError?.type || 'none'}</span></div>
          <div className={rowCls}><span className={labelCls}>token stored</span><span className={valCls(token !== '(none)')}>{token}</span></div>
          <div className={rowCls}><span className={labelCls}>pathname</span><span className="text-cyan-300 font-mono">{window.location.pathname}</span></div>

          {/* Event log */}
          <div className="text-white/40 uppercase text-[9px] tracking-wide pt-2">State Change Log (newest first)</div>
          {events.map((e, i) => (
            <div key={i} className="text-[9px] py-0.5 border-b border-white/5 grid grid-cols-2 gap-1">
              <span className="text-white/30">{e.ts}</span>
              <span className={e.isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                {e.isLoadingAuth ? '⏳load' : e.isAuthenticated ? '✅auth' : '❌noauth'}
                {e.needsOnboarding ? ' →onboard' : ''}
                {e.authError ? ` ERR:${e.authError}` : ''}
              </span>
            </div>
          ))}

          {/* Actions */}
          <div className="pt-2 flex flex-wrap gap-1">
            <button
              onClick={() => { localStorage.removeItem('auth_debug'); location.reload(); }}
              className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-[10px]"
            >
              Disable & reload
            </button>
            <button
              onClick={() => {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('base44'));
                keys.forEach(k => localStorage.removeItem(k));
                location.reload();
              }}
              className="px-2 py-1 bg-orange-800 hover:bg-orange-700 rounded text-[10px]"
            >
              Clear tokens & reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}