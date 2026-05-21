export default function StatCard({ icon: Icon, label, value, change, changeType = 'positive', subtext }) {
  const changeColor = changeType === 'positive' ? 'text-green-600 dark:text-green-400' : changeType === 'neutral' ? 'text-slate-600' : 'text-red-600 dark:text-red-400';

  return (
    <div className="card-base p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {Icon && <Icon size={18} className="text-primary/40" />}
      </div>
      <div className="mb-2">
        <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
      </div>
      {(change || subtext) && (
        <div className="text-xs">
          {change && <p className={`font-medium ${changeColor}`}>{change}</p>}
          {subtext && <p className="text-muted-foreground mt-1">{subtext}</p>}
        </div>
      )}
    </div>
  );
}