import Link from "next/link";
import { getAllApplicationsForAdmin, getAllServicesForAdminFilter, AWAITING_ADMIN_REVIEW } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/customer/status-badge";
import { EmptyState } from "@/components/customer/empty-state";
import { formatDate } from "@/lib/format";
import { formatAppointmentDateShort, formatSlotTime } from "@/lib/applications/appointments";
import { AdminApplicationSearchBar } from "@/components/admin-dashboard/application-search-bar";

function needsAttention(app: { application_documents: { status: string }[] | null }) {
  return (app.application_documents ?? []).some((d) => AWAITING_ADMIN_REVIEW.has(d.status));
}

function AttentionDot() {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-warning-container align-middle"
      role="img"
      aria-label="Needs attention"
      title="Needs attention"
    />
  );
}

function AppointmentCell({
  appointment,
}: {
  appointment: { appointment_date: string; status: string; appointment_slot_templates: { start_time: string } | null } | null;
}) {
  if (!appointment || appointment.status !== "booked") {
    return <span className="text-on-surface-variant">—</span>;
  }
  return (
    <span>
      {formatAppointmentDateShort(appointment.appointment_date)}
      {appointment.appointment_slot_templates ? `, ${formatSlotTime(appointment.appointment_slot_templates.start_time)}` : ""}
    </span>
  );
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; service?: string; created?: string }>;
}) {
  const { q, status, service, created } = await searchParams;

  const [applications, services] = await Promise.all([
    getAllApplicationsForAdmin({
      search: q,
      status,
      serviceId: service,
      createdWithin: created === "today" || created === "week" || created === "month" ? created : undefined,
    }),
    getAllServicesForAdminFilter(),
  ]);

  const hasActiveFilter = !!(q || status || service || created);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg text-foreground">Applications</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Search and manage customer applications.</p>
      </div>

      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 space-y-3">
        <AdminApplicationSearchBar services={services} />

        <p className="text-label-sm text-on-surface-variant">
          {q ? (
            <>
              {applications.length} result{applications.length === 1 ? "" : "s"} found for &ldquo;{q}&rdquo;
            </>
          ) : (
            <>
              {applications.length} application{applications.length === 1 ? "" : "s"}
            </>
          )}
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-8">
          <EmptyState
            message={
              hasActiveFilter
                ? q
                  ? `No applications found for "${q}".`
                  : "No applications found."
                : "No applications have been created yet."
            }
            action={hasActiveFilter ? { label: "Clear filters", href: "/admin/dashboard/applications" } : undefined}
          />
        </div>
      ) : (
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
          {/* Mobile/tablet: cards -- a 7-column table has no honest way to
              fit a phone width, and squeezing it just makes every cell an
              unreadable sliver (this is exactly what happened on the
              dashboard's compact table before it was widened in Phase 3). */}
          <div className="lg:hidden divide-y divide-outline-variant">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/admin/dashboard/applications/${app.id}`}
                className="block p-4 space-y-2 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-primary inline-flex items-center gap-1.5">
                    {needsAttention(app) ? <AttentionDot /> : null}
                    {app.application_number ?? "Draft — not yet submitted"}
                  </span>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-body-md text-foreground font-medium">{app.customers?.full_name ?? "—"}</p>
                <p className="text-label-sm text-on-surface-variant">{app.services?.name ?? "—"}</p>
                <div className="flex items-center justify-between text-label-sm text-on-surface-variant pt-2 border-t border-outline-variant">
                  <span>Submitted {app.submitted_at ? formatDate(app.submitted_at) : "—"}</span>
                  <AppointmentCell appointment={app.currentAppointment} />
                </div>
              </Link>
            ))}
          </div>

          {/* Tablet/desktop: table. Submitted + Appointment only show at
              xl+ (1280px) -- below that (1024-1279px) this is a compact
              5-column table sharing the row with a 288px sidebar, and
              those two columns are the first to go without losing the
              ability to identify, search, and open an application. */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-body-md table-fixed">
              {/* Widths sum to 100% across whichever columns are actually
                  visible at a given breakpoint -- table-fixed recalculates
                  against only the visible <col>s, so this holds for both
                  the 5-column (1024-1279px) and 7-column (1280px+) states
                  without a second colgroup. Customer/Service are truncated
                  in the body to match (long real emails otherwise force
                  the column wider than its share, which is what pushed
                  this table into needing horizontal scroll before). */}
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[18%]" />
                <col className="w-[13%]" />
                <col className="w-[18%]" />
                <col className="hidden xl:table-column w-[12%]" />
                <col className="hidden xl:table-column w-[12%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3 font-medium">Application</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="hidden xl:table-cell px-5 py-3 font-medium">Submitted</th>
                  <th className="hidden xl:table-cell px-5 py-3 font-medium">Appointment</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="px-5 py-3.5 truncate">
                      <Link
                        href={`/admin/dashboard/applications/${app.id}`}
                        className="font-semibold text-primary hover:underline inline-flex items-center gap-1.5 max-w-full"
                        title={app.application_number ?? undefined}
                      >
                        {needsAttention(app) ? <AttentionDot /> : null}
                        <span className="truncate">{app.application_number ?? "Draft"}</span>
                      </Link>
                      {!app.application_number ? (
                        <p className="text-label-sm text-on-surface-variant">Not yet submitted</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="truncate" title={app.customers?.full_name ?? undefined}>
                        {app.customers?.full_name ?? "—"}
                      </div>
                      {app.customers?.email || app.customers?.phone ? (
                        <div
                          className="text-label-sm text-on-surface-variant truncate"
                          title={[app.customers?.email, app.customers?.phone].filter(Boolean).join(" · ")}
                        >
                          {[app.customers?.email, app.customers?.phone].filter(Boolean).join(" · ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 truncate" title={app.services?.name ?? undefined}>
                      {app.services?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="hidden xl:table-cell px-5 py-3.5 whitespace-nowrap text-on-surface-variant">
                      {app.submitted_at ? formatDate(app.submitted_at) : "—"}
                    </td>
                    <td className="hidden xl:table-cell px-5 py-3.5 whitespace-nowrap text-on-surface-variant">
                      <AppointmentCell appointment={app.currentAppointment} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/dashboard/applications/${app.id}`}
                        aria-label={`View application ${app.application_number ?? ""}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                          chevron_right
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
