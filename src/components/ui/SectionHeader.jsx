export default function SectionHeader({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6 border-b border-border">
      <div className="flex items-start gap-3">
        {Icon && <Icon size={24} className="text-primary shrink-0 mt-0.5" />}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={action}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}