export default function PageHeader({ icon: Icon, title, description, breadcrumbs }) {
  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 border-b border-border">
      {breadcrumbs && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                {crumb}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="p-3 rounded-lg bg-primary/10 flex items-center justify-center h-fit">
            <Icon size={24} className="text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{title}</h1>
          {description && <p className="text-base text-muted-foreground max-w-2xl">{description}</p>}
        </div>
      </div>
    </div>
  );
}