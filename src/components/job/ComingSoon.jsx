import { Construction } from 'lucide-react';

export function ComingSoon({ title, description }) {
  return (
    <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
        <Construction size={20} className="text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold font-display">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      </div>
    </div>
  );
}