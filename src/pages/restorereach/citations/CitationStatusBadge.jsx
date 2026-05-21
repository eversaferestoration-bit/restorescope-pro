export const STATUS_CONFIG = {
  consistent:   { label: 'Consistent',   color: '#10b981', bg: '#10b98120', dot: '#10b981' },
  inconsistent: { label: 'Inconsistent', color: '#f59e0b', bg: '#f59e0b20', dot: '#f59e0b' },
  missing:      { label: 'Missing',      color: '#ef4444', bg: '#ef444420', dot: '#ef4444' },
  unchecked:    { label: 'Unchecked',    color: '#3a5a7c', bg: '#1e2d4580', dot: '#3a5a7c' },
};

export default function CitationStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unchecked;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}