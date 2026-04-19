import { Wifi, WifiOff, RefreshCw, Upload, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SyncStatusBar({ isOnline, pendingCount, failedCount, onSync, onRetry }) {
  if (!pendingCount && !failedCount && isOnline) return null;

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium mb-3',
      !isOnline ? 'bg-amber-50 border border-amber-200 text-amber-700' :
      failedCount ? 'bg-red-50 border border-red-200 text-red-700' :
      'bg-blue-50 border border-blue-200 text-blue-700'
    )}>
      <div className="flex items-center gap-2">
        {!isOnline ? <WifiOff size={13} /> : failedCount ? <AlertCircle size={13} /> : <Upload size={13} className="animate-pulse" />}
        <span>
          {!isOnline
            ? `Offline — ${pendingCount} photo${pendingCount !== 1 ? 's' : ''} queued locally`
            : failedCount
            ? `${failedCount} upload${failedCount !== 1 ? 's' : ''} failed`
            : `Syncing ${pendingCount} photo${pendingCount !== 1 ? 's' : ''}…`}
        </span>
      </div>
      <div className="flex gap-2">
        {isOnline && failedCount > 0 && (
          <button onClick={onRetry} className="flex items-center gap-1 underline hover:no-underline">
            <RefreshCw size={11} /> Retry
          </button>
        )}
        {isOnline && pendingCount > 0 && !failedCount && (
          <button onClick={onSync} className="flex items-center gap-1 underline hover:no-underline">
            <RefreshCw size={11} /> Sync now
          </button>
        )}
      </div>
    </div>
  );
}