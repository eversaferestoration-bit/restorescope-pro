import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Clock, ShieldAlert, AlertTriangle, Droplets, CheckCircle } from 'lucide-react';

const URGENCY_CONFIG = {
  emergency: { label: 'Emergency', color: '#dc2626', bg: '#dc262620', icon: ShieldAlert },
  high:      { label: 'High',      color: '#ef4444', bg: '#ef444420', icon: AlertTriangle },
  medium:    { label: 'Medium',    color: '#f59e0b', bg: '#f59e0b20', icon: Droplets },
  low:       { label: 'Low',       color: '#10b981', bg: '#10b98120', icon: CheckCircle },
};

export default function DamageScanHistory({ companyId }) {
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ['damage-scans', companyId],
    queryFn: () => base44.entities.DamageScan.filter({ company_id: companyId }, '-created_date', 20),
    enabled: !!companyId,
  });

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#1e2d45' }} />)}
    </div>
  );

  if (scans.length === 0) return (
    <div className="rounded-xl border py-10 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <Clock size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
      <p className="text-sm text-white font-medium">No scans yet</p>
      <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Your scan history will appear here</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {scans.map(scan => {
        const urg = URGENCY_CONFIG[scan.urgency_level] || URGENCY_CONFIG.medium;
        const Icon = urg.icon;
        const date = scan.created_date ? format(new Date(scan.created_date), 'MMM d, yyyy') : '—';
        return (
          <div key={scan.id} className="rounded-xl border p-4 flex items-start gap-4"
            style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
            {/* Thumbnail grid */}
            {scan.uploaded_photos?.length > 0 ? (
              <div className="grid grid-cols-2 gap-0.5 w-14 h-14 rounded-lg overflow-hidden shrink-0">
                {scan.uploaded_photos.slice(0, 4).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full h-full object-cover" />
                ))}
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center"
                style={{ background: '#1e2d45' }}>
                <Icon size={20} style={{ color: urg.color }} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-sm font-semibold text-white truncate">
                  {scan.customer_name || 'Unknown Property'}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ background: urg.bg, color: urg.color }}>{urg.label}</span>
              </div>
              <p className="text-xs truncate mb-1" style={{ color: '#7ba3c8' }}>
                {scan.property_address || 'No address'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {scan.detected_damage_types?.slice(0, 3).map((d, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-lg"
                    style={{ background: '#1e2d45', color: '#c8d9eb' }}>{d}</span>
                ))}
                {(scan.detected_damage_types?.length || 0) > 3 && (
                  <span className="text-xs" style={{ color: '#3a5a7c' }}>
                    +{scan.detected_damage_types.length - 3}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs" style={{ color: '#3a5a7c' }}>{date}</p>
              {scan.confidence_score != null && (
                <p className="text-xs font-bold mt-0.5" style={{ color: urg.color }}>
                  {scan.confidence_score}%
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}