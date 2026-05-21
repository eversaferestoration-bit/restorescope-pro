import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

const typeConfig = {
  success: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', icon: CheckCircle, color: 'text-green-700 dark:text-green-400' },
  error: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: AlertCircle, color: 'text-red-700 dark:text-red-400' },
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', icon: AlertTriangle, color: 'text-yellow-700 dark:text-yellow-400' },
  info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: Info, color: 'text-blue-700 dark:text-blue-400' },
};

export default function Toast({ type = 'info', title, description, onClose, action, actionLabel }) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4 flex items-start gap-3 animate-fade-in-scale`}>
      <Icon size={20} className={`${config.color} shrink-0 mt-0.5`} />
      <div className="flex-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {description && <p className={`text-sm mt-1 ${config.color}`}>{description}</p>}
      </div>
      {action && (
        <button onClick={action} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          {actionLabel}
        </button>
      )}
      {onClose && (
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      )}
    </div>
  );
}