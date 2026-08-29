import Link from "next/link";
import { getMyApplicationsWithProgress } from "@/lib/customer/queries";
import { ApplicationSummaryCard } from "@/components/customer/application-summary-card";
import { EmptyState } from "@/components/customer/empty-state";
import type { ApplicationProgress } from "@/lib/applications/progress";

/**
 * Action-required beats everything else regardless of raw status -- a
 * customer whose submitted application needs a re-upload should see it
 * before an untouched draft. Terminal/completed applications sink to the
 * bottom since there's nothing left to do with them.
 */
function priorityRank(progress: ApplicationProgress): number {
  if (progress.actionRequired.length > 0) return 0;
  if (progress.stage === "draft") return 1;
  if (progress.terminal) return 3;
  return 2;
}

export default async function CustomerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const applications = await getMyApplicationsWithProgress();
  const sorted = [...applications].sort((a, b) => priorityRank(a.progress) - priorityRank(b.progress));

  return (
    <div className="space-y-4">
      <h1 className="text-headline-md text-foreground">My applications</h1>
      {deleted === "1" ? (
        <p className="rounded-xl bg-tertiary-container text-on-tertiary-container text-body-md px-4 py-3">
          Application deleted successfully.
        </p>
      ) : null}
      {sorted.length === 0 ? (
        <EmptyState message="No applications yet. Choose a service to get started." action={{ label: "Browse services", href: "/customer/services" }} />
      ) : (
        <div className="space-y-3">
          {sorted.map(({ application, progress }) => (
            <ApplicationSummaryCard key={application.id} application={application} progress={progress} />
          ))}
        </div>
      )}
      {sorted.length > 0 ? (
        <Link href="/customer/services" className="inline-block text-label-sm text-primary font-medium">
          + Start a new application
        </Link>
      ) : null}
    </div>
  );
}
