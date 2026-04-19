const MOD_LABELS = {
  emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700' },
  after_hours: { label: 'After Hours', color: 'bg-orange-100 text-orange-700' },
  complexity: { label: 'Complexity', color: 'bg-purple-100 text-purple-700' },
  access: { label: 'Access Difficulty', color: 'bg-amber-100 text-amber-700' },
};

export default function EstimateModifiersBadge({ modifiers }) {
  if (!modifiers || !Object.keys(modifiers).length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(modifiers).map(([key, val]) => {
        const cfg = MOD_LABELS[key] || { label: key, color: 'bg-muted text-muted-foreground' };
        return (
          <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
            {cfg.label} ×{val.toFixed(2)}
          </span>
        );
      })}
    </div>
  );
}