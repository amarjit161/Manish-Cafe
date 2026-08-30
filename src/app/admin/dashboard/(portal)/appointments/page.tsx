import Link from "next/link";
import { getAdminAppointments, getAllServicesForAdminFilter } from "@/lib/admin/queries";
import { EmptyState } from "@/components/customer/empty-state";
import { formatAppointmentDateShort, formatSlotTime, APPOINTMENT_STATUS_CHIP, type AppointmentStatus } from "@/lib/applications/appointments";
import { AppointmentStatusActions } from "@/components/admin-dashboard/appointment-status-actions";
import { AppointmentStatusChip } from "@/components/admin-dashboard/appointment-status-chip";
import { AppointmentCardRow } from "@/components/admin-dashboard/appointment-card-row";
import { ReportStatCard } from "@/components/admin-dashboard/report-stat-card";

const MOBILE_REGISTERED_LABEL: Record<string, string> = {
  yes: "Registered",
  no: "Not registered",
  unknown: "Not sure",
  registered_other: "Someone else's",
};

const APPOINTMENT_STATUSES: AppointmentStatus[] = ["booked", "completed", "cancelled", "no_show"];

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-label-sm font-medium text-on-surface-variant mb-1.5">{label}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`min-h-11 flex items-center rounded-full border px-3.5 text-label-sm font-medium transition-colors ${
        active ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-foreground hover:bg-surface-container-low"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; range?: string; status?: string; service?: string; mobile?: string; q?: string }>;
}) {
  const { date, range, status, service, mobile, q } = await searchParams;

  const filters: Parameters<typeof getAdminAppointments>[0] = {};
  if (date) filters.date = date;
  else if (range === "today") filters.date = todayStr();
  else if (range === "tomorrow") filters.date = todayStr(1);
  else if (range === "week") {
    filters.dateFrom = todayStr();
    filters.dateTo = todayStr(7);
  }
  if (status) filters.status = status;
  if (service) filters.serviceId = service;
  if (mobile) filters.mobileRegistered = mobile as "yes" | "no" | "unknown" | "registered_other";
  if (q) filters.search = q;

  const [appointments, services] = await Promise.all([getAdminAppointments(filters), getAllServicesForAdminFilter()]);

  // Derived from the exact same (already filtered) rows the table/cards
  // below render -- never a second, separately-filtered query. "Pending"
  // has no real backing here (appointments has no such status: only
  // booked/completed/cancelled/no_show exist), so this uses the real
  // statuses directly rather than inventing one.
  const confirmedCount = appointments.filter((a) => a.status === "booked").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled" || a.status === "no_show").length;

  const exportParams = new URLSearchParams();
  if (filters.date) exportParams.set("date", filters.date);
  if (filters.dateFrom) exportParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) exportParams.set("dateTo", filters.dateTo);
  if (filters.status) exportParams.set("status", filters.status);
  if (filters.serviceId) exportParams.set("service", filters.serviceId);
  if (filters.mobileRegistered) exportParams.set("mobile", filters.mobileRegistered);
  if (filters.search) exportParams.set("q", filters.search);

  const hasFilters = !!(date || range || status || service || mobile || q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-lg text-foreground">Appointments</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Manage and track service appointments at Manish Cafe &amp; Cyber Zone.
          </p>
        </div>
        <a
          href={`/api/admin/appointments/export?${exportParams.toString()}`}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-on-primary px-4 text-label-lg font-medium hover:brightness-110 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            download
          </span>
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <ReportStatCard label="Total" value={appointments.length} icon="event" />
        <ReportStatCard label="Confirmed" value={confirmedCount} icon="event_available" />
        <ReportStatCard label="Completed" value={completedCount} icon="check_circle" />
        <ReportStatCard label="Cancelled" value={cancelledCount} icon="cancel" />
      </div>

      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 space-y-4">
        <FilterGroup label="Date">
          <FilterPill href="?range=today" active={range === "today" && !date}>
            Today
          </FilterPill>
          <FilterPill href="?range=tomorrow" active={range === "tomorrow"}>
            Tomorrow
          </FilterPill>
          <FilterPill href="?range=week" active={range === "week"}>
            This week
          </FilterPill>
          <FilterPill href="?" active={!date && !range}>
            All
          </FilterPill>
        </FilterGroup>

        {services.length > 0 ? (
          <FilterGroup label="Service">
            {services.map((s) => (
              <FilterPill key={s.id} href={`?service=${s.id}`} active={service === s.id}>
                {s.name}
              </FilterPill>
            ))}
          </FilterGroup>
        ) : null}

        <FilterGroup label="Status">
          {APPOINTMENT_STATUSES.map((s) => (
            <FilterPill key={s} href={`?status=${s}`} active={status === s}>
              {APPOINTMENT_STATUS_CHIP[s]}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="Aadhaar mobile registered">
          {Object.entries(MOBILE_REGISTERED_LABEL).map(([value, label]) => (
            <FilterPill key={value} href={`?mobile=${value}`} active={mobile === value}>
              {label}
            </FilterPill>
          ))}
        </FilterGroup>

        <div className="flex flex-wrap items-center gap-2">
          <form className="flex-1 min-w-60 flex gap-2">
            <label htmlFor="appointment-search" className="sr-only">
              Search by name, mobile, or application number
            </label>
            <input
              id="appointment-search"
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search name, mobile, or application number"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-foreground"
            />
            <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-label-md font-medium text-on-primary">
              Search
            </button>
          </form>
          {hasFilters ? (
            <Link
              href="?"
              className="inline-flex min-h-11 items-center gap-1 text-label-sm font-medium text-primary"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                filter_alt_off
              </span>
              Clear filters
            </Link>
          ) : null}
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyState message="No appointments match these filters." />
      ) : (
        <>
          {/* Mobile/tablet: cards. Stays cards through 1024px -- the
              desktop table's Actions column (up to 3 buttons) needs more
              width than a typical 4-column admin table, so it only takes
              over at xl (1280px) rather than the usual lg (1024px). */}
          <div className="xl:hidden space-y-3">
            {appointments.map((a) => (
              <AppointmentCardRow key={a.id} appointment={a} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden xl:block rounded-xl border border-outline-variant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-md">
                <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
                  <tr>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap font-medium">
                      Date &amp; time
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap font-medium">
                      Customer
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap font-medium">
                      Service
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap font-medium">
                      Application
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-foreground font-medium">{formatAppointmentDateShort(a.appointment_date)}</p>
                        <p className="text-label-sm text-on-surface-variant">
                          {a.appointment_slot_templates ? formatSlotTime(a.appointment_slot_templates.start_time) : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground font-medium">{a.customers?.full_name ?? "—"}</p>
                        <p className="text-label-sm text-on-surface-variant">{a.primary_mobile}</p>
                      </td>
                      <td className="px-4 py-3">{a.applications?.services?.name ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/admin/dashboard/applications/${a.application_id}`} className="text-primary underline underline-offset-2">
                          {a.applications?.application_number ?? "View"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <AppointmentStatusChip status={a.status} />
                      </td>
                      <td className="px-4 py-3">
                        <AppointmentStatusActions appointmentId={a.id} status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
