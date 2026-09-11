import { CARD_CLASS } from './Card';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border/70 ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className={`${CARD_CLASS} p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="hidden h-4 w-24 sm:block" />
      <Skeleton className="hidden h-4 w-20 md:block" />
      <Skeleton className="ml-auto h-6 w-20 rounded-badge" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className={`${CARD_CLASS} divide-y divide-border overflow-hidden`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
