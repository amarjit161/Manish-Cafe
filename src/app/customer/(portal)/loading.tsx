import { Skeleton } from "@/components/layout/skeleton";

// Next.js wraps this route group's page in a Suspense boundary using this
// file automatically -- it only shows while the page's own server-side
// data fetch is actually in flight, never as an artificial delay.
export default function CustomerPortalLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
