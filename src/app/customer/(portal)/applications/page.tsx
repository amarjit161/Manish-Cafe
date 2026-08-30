import Link from "next/link";
import { getMyApplicationsWithProgress } from "@/lib/customer/queries";
import { ApplicationSummaryCard } from "@/components/customer/application-summary-card";
import { EmptyState } from "@/components/customer/empty-state";
import { applicationPriorityRank } from "@/lib/applications/progress";

export default async function CustomerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const applications = await getMyApplicationsWithProgress();
  const sorted = [...applications].sort(
    (a, b) => applicationPriorityRank(a.progress, a.appointment) - applicationPriorityRank(b.progress, b.appointment),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-md md:text-headline-lg text-foreground font-bold">My applications</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Track every application you&rsquo;ve started with Manish Cafe, in one place.
          </p>
        </div>
        {sorted.length > 0 ? (
          <Link
            href="/customer/services"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-primary text-on-primary px-4 text-label-lg font-medium hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            New application
          </Link>
        ) : null}
      </div>

      {deleted === "1" ? (
        <p className="flex items-center gap-2 rounded-xl bg-success-container text-on-success-container text-body-md px-4 py-3">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            check_circle
          </span>
          Application deleted successfully.
        </p>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState message="No applications yet. Choose a service to get started." action={{ label: "Browse services", href: "/customer/services" }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map(({ application, progress, appointment }) => (
            <ApplicationSummaryCard key={application.id} application={application} progress={progress} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
}
