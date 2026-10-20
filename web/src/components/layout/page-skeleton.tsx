import { Skeleton } from '@/components/ui/skeleton';

/** Shell-shaped fallback so lazy routes do not flash an empty page. */
export function PageSkeleton() {
  return (
    <div className="min-h-svh bg-background">
      <div className="flex h-14 items-center gap-2 border-b bg-card px-4 lg:hidden">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="hidden border-r bg-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-64" />

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-screen-xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-9 w-64" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
