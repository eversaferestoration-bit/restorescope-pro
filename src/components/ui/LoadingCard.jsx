export default function LoadingCard({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-base p-6 space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse-soft w-3/4" />
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded animate-pulse-soft" />
            <div className="h-3 bg-muted rounded animate-pulse-soft w-5/6" />
          </div>
          <div className="flex gap-2 pt-4">
            <div className="h-8 bg-muted rounded animate-pulse-soft flex-1" />
            <div className="h-8 bg-muted rounded animate-pulse-soft flex-1" />
          </div>
        </div>
      ))}
    </>
  );
}