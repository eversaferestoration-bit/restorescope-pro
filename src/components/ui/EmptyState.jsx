import { AlertCircle } from 'lucide-react';
import { Button } from './button';

export default function EmptyState({ icon: Icon = AlertCircle, title, description, action, actionLabel = 'Get Started' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-4 rounded-full bg-muted/40 flex items-center justify-center">
        <Icon size={32} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>}
      {action && <Button onClick={action}>{actionLabel}</Button>}
    </div>
  );
}