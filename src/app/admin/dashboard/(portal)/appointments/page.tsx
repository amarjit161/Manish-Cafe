import Link from "next/link";
import { getAdminAppointments } from "@/lib/admin/queries";
import { EmptyState } from "@/components/customer/empty-state";
import { formatAppointmentDateShort, formatSlotTime, APPOINTMENT_STATUS_CHIP, type AppointmentStatus } from "@/lib/applications/appointments";
import { AppointmentStatusActions } from "@/components/admin-dashboard/appointment-status-actions";

const MOBILE_REGISTERED_LABEL: Record<string, string> = {
  yes: "Registered",
  no: "Not registered",
  unknown: "Not sure",
  registered_other: "Someone else's",
};

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; range?: string; status?: string; mobile?: string; q?: string }>;
}) {
  const { date, range, status, mobile, q } = await searchParams;

  const filters: Parameters<typeof getAdminAppointments>[0] = {};
  if (date) filters.date = date;
  else if (range === "today") filters.date = todayStr();
  else if (range === "tomorrow") filters.date = todayStr(1);
  else if (range === "week") {
    filters.dateFrom = todayStr();
    filters.dateTo = todayStr(7);
  }
  if (status) filters.status = status;
  if (mobile) filters.mobileRegistered = mobile as "yes" | "no" | "unknown" | "registered_other";
  if (q) filters.search = q;

  const appointments = await getAdminAppointments(filters);

  const exportParams = new URLSearchParams();
  if (filters.date) exportParams.set("date", filters.date);
  if (filters.dateFrom) exportParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) exportParams.set("dateTo", filters.dateTo);
  if (filters.status) exportParams.set("status", filters.status);
  if (filters.mobileRegistered) exportParams.set("mobile", filters.mobileRegistered);
  if (filters.search) exportParams.set("q", filters.search);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-headline-lg text-foreground">Appointments</h1>
        <a
          href={`/api/admin/appointments/export?${exportParams.toString()}`}
          className="rounded-lg border border-outline-variant px-4 py-2 text-label-sm font-medium text-foreground"
        >
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-2 text-label-sm">
        {[
          { label: "Today", href: "?range=today" },
          { label: "Tomorrow", href: "?range=tomorrow" },
          { label: "This week", href: "?range=week" },
          { label: "All", href: "?" },
        ].map((f) => (
          <Link key={f.label} href={f.href} className="rounded-full border border-outline-variant px-3 py-1.5 text-foreground">
            {f.label}
          </Link>
        ))}
        <span className="mx-1 text-on-surface-variant">|</span>
        {["booked", "completed", "cancelled", "no_show"].map((s) => (
          <Link
            key={s}
            href={`?status=${s}`}
            className={`rounded-full border px-3 py-1.5 ${status === s ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-foreground"}`}
          >
            {APPOINTMENT_STATUS_CHIP[s as AppointmentStatus]}
          </Link>
        ))}
        <span className="mx-1 text-on-surface-variant">|</span>
        {Object.entries(MOBILE_REGISTERED_LABEL).map(([value, label]) => (
          <Link
            key={value}
            href={`?mobile=${value}`}
            className={`rounded-full border px-3 py-1.5 ${mobile === value ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, mobile, or application number"
          className="min-h-11 flex-1 rounded-lg border border-outline-variant px-3 text-body-md"
        />
        <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-label-md font-medium text-on-primary">
          Search
        </button>
      </form>

      {appointments.length === 0 ? (
        <EmptyState message="No appointments match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-left text-body-md">
            <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Time</th>
                <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 whitespace-nowrap">Application</th>
                <th className="px-4 py-3 whitespace-nowrap">Service</th>
                <th className="px-4 py-3 whitespace-nowrap">Mobile</th>
                <th className="px-4 py-3 whitespace-nowrap">Alt. mobile</th>
                <th className="px-4 py-3 whitespace-nowrap">Aadhaar mobile</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const answers = (a.applications?.answers ?? {}) as Record<string, unknown>;
                const mobileRegistered = typeof answers.mobile_registered === "string" ? answers.mobile_registered : null;
                return (
                  <tr key={a.id} className="border-t border-outline-variant">
                    <td className="px-4 py-3 whitespace-nowrap">{formatAppointmentDateShort(a.appointment_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.appointment_slot_templates ? formatSlotTime(a.appointment_slot_templates.start_time) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{a.customers?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/admin/dashboard/applications/${a.application_id}`} className="text-primary underline">
                        {a.applications?.application_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{a.applications?.services?.name ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{a.primary_mobile}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{a.alternative_mobile ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {mobileRegistered ? MOBILE_REGISTERED_LABEL[mobileRegistered] ?? mobileRegistered : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{APPOINTMENT_STATUS_CHIP[a.status]}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <AppointmentStatusActions appointmentId={a.id} status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
