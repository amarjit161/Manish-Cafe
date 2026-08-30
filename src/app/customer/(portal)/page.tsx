import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMyApplicationsWithProgress, getActiveServices, getUpcomingAppointment } from "@/lib/customer/queries";
import { ApplicationSummaryCard } from "@/components/customer/application-summary-card";
import { ActionRequiredCard } from "@/components/customer/action-required-card";
import { UpcomingAppointmentCard } from "@/components/customer/upcoming-appointment-card";
import { ServiceQuickCard } from "@/components/customer/service-quick-card";
import { EmptyState } from "@/components/customer/empty-state";
import { getTimeOfDayGreeting } from "@/lib/format";
import { applicationPriorityRank } from "@/lib/applications/progress";

const PRIMARY_ACTIONS = [
  {
    href: "/customer/services",
    label: "Apply for a Service",
    icon: "add_circle",
  },
  {
    href: "/customer/applications",
    label: "My Applications",
    icon: "assignment",
  },
] as const;

export default async function CustomerDashboardPage() {
  const [profile, applications, services, upcomingAppointment] = await Promise.all([
    getCurrentUserProfile(),
    getMyApplicationsWithProgress(),
    getActiveServices(),
    getUpcomingAppointment(),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];
  const greeting = getTimeOfDayGreeting();

  // The single highest-priority thing on the page, per the "what needs my
  // attention right now" ordering -- an application needing action beats
  // everything else. Only the most recent one surfaces here; the full list
  // (including any others needing action) lives in "Recent applications"
  // below, so this never duplicates that section's own status logic.
  const needsAction = applications.find(({ progress }) => progress.actionRequired.length > 0);

  const recentApplications = [...applications]
    .sort((a, b) => applicationPriorityRank(a.progress, a.appointment) - applicationPriorityRank(b.progress, b.appointment))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* 1. Greeting */}
      <div>
        <h1 className="text-headline-md md:text-headline-lg text-foreground font-bold">
          {greeting}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Here&rsquo;s what&rsquo;s happening with your applications today.
        </p>
      </div>

      {/* 2. Action required */}
      {needsAction ? (
        <ActionRequiredCard application={needsAction.application} item={needsAction.progress.actionRequired[0]} />
      ) : null}

      {/* 3. Primary actions + quick service actions */}
      <section className="space-y-3">
        <h2 className="text-label-lg font-semibold text-foreground">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {PRIMARY_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col gap-2.5 rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 hover:border-primary/40 transition-colors"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
              </span>
              <span className="text-body-md font-semibold text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>

        {services.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {services.slice(0, 4).map((service) => (
                <ServiceQuickCard key={service.id} service={service} />
              ))}
            </div>
            <Link href="/customer/services" className="inline-block text-label-sm text-primary font-medium">
              Browse all services →
            </Link>
          </>
        ) : null}
      </section>

      {/* 4. Upcoming appointment */}
      {upcomingAppointment ? <UpcomingAppointmentCard appointment={upcomingAppointment} /> : null}

      {/* 5. Recent applications */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-label-lg font-semibold text-foreground">Recent applications</h2>
          {applications.length > 0 ? (
            <Link href="/customer/applications" className="text-label-sm text-primary font-medium">
              View all
            </Link>
          ) : null}
        </div>
        {applications.length === 0 ? (
          <EmptyState
            message="You haven't started an application yet."
            action={{ label: "Browse services", href: "/customer/services" }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentApplications.map(({ application, progress, appointment }) => (
              <ApplicationSummaryCard key={application.id} application={application} progress={progress} appointment={appointment} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
