export default function EmptyState({ icon: Icon, title, description, action, actionLabel, variant = 'default' }) {
  const variants = {
    default: 'bg-card border border-border rounded-xl',
    minimal: 'bg-transparent',
    muted: 'bg-muted/20 border border-border/50 rounded-lg',
  };

  return (
    <div className={`${variants[variant]} p-8 sm:p-12 md:p-16 flex flex-col items-center justify-center text-center`}>
      {Icon && (
        <div className="mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Icon size={28} className="text-primary/60" />
          </div>
        </div>
      )}
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}