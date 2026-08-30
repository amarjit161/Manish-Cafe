import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  getAdminDashboardStats,
  getAllApplicationsForAdmin,
  getAdminAppointments,
  AWAITING_ADMIN_REVIEW,
} from "@/lib/admin/queries";
import { StatCard } from "@/components/customer/stat-card";
import { StatusBadge } from "@/components/customer/status-badge";
import { EmptyState } from "@/components/customer/empty-state";
import { todayDateString, formatSlotTime } from "@/lib/applications/appointments";

export default async function AdminSaasDashboardPage() {
  const today = todayDateString();

  // One dashboard data load, not one request per card: getAllApplicationsForAdmin()
  // (already fetching application_documents(status) per row for the applications
  // list page) is reused as-is for "today's new", "requiring attention" and
  // "recent applications" -- three sections, zero extra queries.
  const [profile, stats, applications, todaysAppointments] = await Promise.all([
    getCurrentUserProfile(),
    getAdminDashboardStats(),
    getAllApplicationsForAdmin(),
    getAdminAppointments({ date: today }),
  ]);

  const newToday = applications.filter((a) => a.created_at.slice(0, 10) === today).length;
  const needingAttention = applications.filter((a) =>
    (a.application_documents ?? []).some((d) => AWAITING_ADMIN_REVIEW.has(d.status)),
  );
  const recentApplications = applications.slice(0, 8);

  const kpis = [
    { label: "New Today", value: newToday, icon: "post_add", tone: "primary" as const },
    { label: "Appointments", value: todaysAppointments.length, icon: "event", tone: "info" as const },
    { label: "Pending Review", value: stats.pendingDocumentReviews, icon: "hourglass_top", tone: "warning" as const },
    { label: "Action Required", value: stats.reuploadRequiredDocuments, icon: "error", tone: "error" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg text-foreground">Dashboard</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Overview of today&rsquo;s activity and applications needing attention.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </div>

      {/* Applications Requiring Attention */}
      <section className="rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-outline-variant flex items-center gap-2 bg-warning-container/25">
          <span className="material-symbols-outlined text-warning-container text-[20px]" aria-hidden="true">
            error
          </span>
          <h2 className="text-label-lg text-foreground font-semibold">Applications Requiring Attention</h2>
          {needingAttention.length > 0 ? (
            <span className="ml-auto text-label-sm text-on-surface-variant">{needingAttention.length}</span>
          ) : null}
        </div>
        {needingAttention.length === 0 ? (
          <div className="p-5">
            <EmptyState message="No applications require attention right now." />
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {needingAttention.slice(0, 5).map((app) => (
              <li key={app.id}>
                <Link
                  href={`/admin/dashboard/applications/${app.id}`}
                  className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-surface-container-low transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold text-primary truncate">
                      {app.application_number ?? "Draft"}
                    </p>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {app.customers?.full_name ?? "—"} · {app.services?.name ?? "—"}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Today's Appointments + Recent Applications */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <section className="order-2 xl:order-1 rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-label-lg text-foreground font-semibold">Recent Applications</h2>
            <Link href="/admin/dashboard/applications" className="text-label-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No applications have been created yet." />
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="lg:hidden divide-y divide-outline-variant">
                {recentApplications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/admin/dashboard/applications/${app.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold text-primary truncate">
                        {app.application_number ?? "Draft"}
                      </p>
                      <p className="text-label-sm text-on-surface-variant truncate">
                        {app.customers?.full_name ?? "—"} · {app.services?.name ?? "—"}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </Link>
                ))}
              </div>

              {/* Desktop/tablet: compact table. Customer/Service are capped
                  and truncated -- this column sits in a constrained grid
                  track, not the full page width, so it can't grow to fit
                  arbitrarily long real names/service titles the way the
                  full Applications list page can. */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-body-md table-fixed">
                  <colgroup>
                    <col className="w-[32%]" />
                    <col className="w-[26%]" />
                    <col className="w-[26%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead className="text-label-sm text-on-surface-variant">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Application</th>
                      <th className="px-5 py-2.5 font-medium">Customer</th>
                      <th className="px-5 py-2.5 font-medium">Service</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {recentApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="px-5 py-3 truncate">
                          <Link
                            href={`/admin/dashboard/applications/${app.id}`}
                            className="font-semibold text-primary hover:underline"
                            title={app.application_number ?? undefined}
                          >
                            {app.application_number ?? "Draft"}
                          </Link>
                        </td>
                        <td className="px-5 py-3 truncate" title={app.customers?.full_name ?? undefined}>
                          {app.customers?.full_name ?? "—"}
                        </td>
                        <td className="px-5 py-3 truncate" title={app.services?.name ?? undefined}>
                          {app.services?.name ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={app.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="order-1 xl:order-2 rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-label-lg text-foreground font-semibold">Today&rsquo;s Appointments</h2>
            <Link href="/admin/dashboard/appointments" className="text-label-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          {todaysAppointments.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No appointments scheduled for today." />
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {todaysAppointments.slice(0, 6).map((appt) => (
                <li key={appt.id}>
                  <Link
                    href={appt.application_id ? `/admin/dashboard/applications/${appt.application_id}` : "/admin/dashboard/appointments"}
                    className="flex items-start gap-3 px-4 sm:px-5 py-3 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-primary-container/15 text-primary flex flex-col items-center justify-center leading-none">
                      <span className="text-label-sm font-bold">
                        {appt.appointment_slot_templates ? formatSlotTime(appt.appointment_slot_templates.start_time).split(" ")[0] : "—"}
                      </span>
                      <span className="text-[10px]">
                        {appt.appointment_slot_templates ? formatSlotTime(appt.appointment_slot_templates.start_time).split(" ")[1] : ""}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold text-foreground truncate">
                        {appt.customers?.full_name ?? "—"}
                      </p>
                      <p className="text-label-sm text-on-surface-variant truncate">
                        {appt.applications?.services?.name ?? "Appointment"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
