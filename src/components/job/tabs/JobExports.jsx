import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FileText, Camera, BookOpen, Download, Loader2, CheckCircle2, Lock, AlertTriangle, Info } from 'lucide-react';
import UpgradeGate from '@/components/trial/UpgradeGate';
import TrialBanner from '@/components/trial/TrialBanner';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useBetaAccess } from '@/hooks/useBetaAccess';
import BetaExpiredGate from '@/components/beta/BetaExpiredGate';
import UpgradeRequiredModal from '@/components/trial/UpgradeRequiredModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const EXPORTS = [
  {
    key: 'estimate',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    label: 'Estimate PDF',
    description: 'Full line-item breakdown with totals, applied modifiers, and approval record.',
    requiresApproved: true,
  },
  {
    key: 'photos',
    icon: Camera,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    label: 'Photo Report',
    description: 'All job photos organized by room, with captions and AI damage tags.',
    requiresApproved: false,
  },
  {
    key: 'justification',
    icon: BookOpen,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    label: 'Justification Package',
    description: 'AI-generated carrier-facing justification notes with full evidence appendix.',
    requiresApproved: true,
  },
];

function ExportCard({ config, approvedDraft, photoCount, onExport, loading }) {
  const Icon = config.icon;
  const isLocked = config.requiresApproved && !approvedDraft;
  const isExporting = loading === config.key;

  return (
    <div className={cn(
      'bg-card rounded-xl border p-5 flex flex-col gap-3 transition-all',
      isLocked ? 'opacity-60' : 'hover:shadow-sm'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', config.bg)}>
          <Icon size={18} className={config.color} />
        </div>
        {isLocked ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Lock size={10} /> Requires approved estimate
          </span>
        ) : config.key === 'photos' && photoCount === 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Info size={10} /> No photos
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
            <CheckCircle2 size={10} /> Ready
          </span>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-sm font-display">{config.label}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{config.description}</p>
      </div>

      {config.requiresApproved && approvedDraft && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          {approvedDraft.status === 'locked' ? <Lock size={11} /> : <CheckCircle2 size={11} className="text-green-600" />}
          <span>{approvedDraft.label} · ${(approvedDraft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span className="capitalize ml-1 font-medium">({approvedDraft.status})</span>
        </div>
      )}

      <button
        onClick={() => onExport(config.key)}
        disabled={isLocked || isExporting}
        className={cn(
          'mt-auto w-full h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition',
          isLocked
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70'
        )}
      >
        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {isExporting ? 'Generating…' : `Export ${config.label}`}
      </button>
    </div>
  );
}

export default function JobExports({ job }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { canUse, isTrial, isExpired, daysLeft } = useTrialStatus();
  const { isBlockedByExpiredBeta } = useBetaAccess();

  const { data: drafts = [] } = useQuery({
    queryKey: ['estimates', job.id],
    queryFn: () => base44.entities.EstimateDraft.filter({ job_id: job.id, is_deleted: false }, '-version_number'),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['photos', job.id],
    queryFn: () => base44.entities.Photo.filter({ job_id: job.id, is_deleted: false }),
  });

  const approvedDraft = drafts.find((d) => d.status === 'approved' || d.status === 'locked');

  const handleExport = async (exportType) => {
    if (isBlockedByExpiredBeta) {
      setShowUpgradeModal(true);
      return;
    }
    setLoading(exportType);
    setError('');
    setSuccess('');
    try {
      const res = await base44.functions.invoke('exportJob', { job_id: job.id, export_type: exportType }, { responseType: 'arraybuffer' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const label = EXPORTS.find((e) => e.key === exportType)?.label || exportType;
      const filename = `${exportType}-${job.job_number || job.id}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`${label} downloaded successfully.`);
    } catch (err) {
      const data = err?.response?.data;
      // data may be ArrayBuffer if error came back as binary — try parse
      let msg = 'Export failed. Please try again.';
      if (data && typeof data === 'object' && !(data instanceof ArrayBuffer)) {
        msg = data.message || data.error || msg;
      }
      setError(msg);
    }
    setLoading(null);
  };



  if (isExpired) {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold font-display">Export Documents</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Generate professional PDFs for carrier submission, documentation, and records.</p>
        </div>
        <TrialBanner isExpired={true} daysLeft={null} />
        <UpgradeGate allowed={false} feature="document exports" reason="Your trial has ended. Upgrade to export estimates, photos, and justification packages." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold font-display">Export Documents</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generate professional PDFs for carrier submission, documentation, and records.
        </p>
      </div>

      {/* Trial countdown hint */}
      {isTrial && daysLeft !== null && daysLeft <= 5 && (
        <TrialBanner daysLeft={daysLeft} isExpired={false} compact />
      )}

      {/* Status banners */}
      {!approvedDraft && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
          <p>An <strong>approved or locked estimate</strong> is required to export the Estimate PDF and Justification Package. Complete the approval workflow first.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EXPORTS.map((cfg) => (
          <ExportCard
            key={cfg.key}
            config={cfg}
            approvedDraft={approvedDraft}
            photoCount={photos.length}
            onExport={handleExport}
            loading={loading}
          />
        ))}
      </div>

      {/* Last approved estimate summary */}
      {approvedDraft && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Approved Estimate</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Version', approvedDraft.label],
              ['Status', approvedDraft.status],
              ['Total', `$${(approvedDraft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
              ['Approved By', approvedDraft.approved_by || '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold capitalize mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          {approvedDraft.approved_at && (
            <p className="text-xs text-muted-foreground mt-3">
              Approved on {format(new Date(approvedDraft.approved_at), 'MMMM d, yyyy \'at\' h:mm a')}
            </p>
          )}
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <UpgradeRequiredModal
          action="Exporting documents"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}