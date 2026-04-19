import { cn } from '@/lib/utils';

export default function LoadingSkeleton({ className }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted', className)} />
  );
}