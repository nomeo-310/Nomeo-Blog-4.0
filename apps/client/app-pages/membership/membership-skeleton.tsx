import { Skeleton } from "@/components/ui/skeleton";

/* Skeleton loader - Using shadcn/ui Skeleton components with responsive layout */
export function MembershipSkeleton() {
  return (
    <div className="w-full bg-background pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header skeleton */}
        <div className="mx-auto max-w-3xl pt-16 pb-12 text-center md:pt-20 md:pb-16">
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto mt-4 h-10 w-3/4 md:h-12" />
          <Skeleton className="mx-auto mt-4 h-16 w-full max-w-2xl" />
        </div>

        {/* Two-column skeleton layout with center alignment */}
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center">
          {/* Left column skeleton - Different for mobile/desktop */}
          <div className="lg:w-1/3">
            {/* Mobile pill skeletons */}
            <div className="lg:hidden">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
            </div>

            {/* Desktop card skeletons */}
            <div className="hidden lg:block">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Details card skeleton */}
          <div className="lg:w-2/3">
            <Skeleton className="h-[500px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
