export default function LoadingCard({ count = 1, variant = 'default' }) {
  const variants = {
    default: 'h-24 rounded-lg',
    compact: 'h-16 rounded-md',
    tall: 'h-48 rounded-xl',
  };

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${variants[variant]} bg-muted rounded-lg animate-pulse-soft`}
        />
      ))}
    </div>
  );
}