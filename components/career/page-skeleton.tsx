import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the career pages (header, a hero row and a few cards). */
export function CareerPageSkeleton({ cards = 3, hero = true }: { cards?: number; hero?: boolean }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {hero && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-52 rounded-xl lg:col-span-2" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
