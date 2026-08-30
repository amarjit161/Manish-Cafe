import Link from "next/link";
import { formatAppointmentDateShort, formatSlotTime, type AppointmentStatus } from "@/lib/applications/appointments";
import { AppointmentStatusChip } from "@/components/admin-dashboard/appointment-status-chip";
import { AppointmentStatusActions } from "@/components/admin-dashboard/appointment-status-actions";

type Row = {
  id: string;
  application_id: string | null;
  appointment_date: string;
  status: AppointmentStatus;
  primary_mobile: string;
  appointment_slot_templates: { start_time: string } | null;
  applications: { application_number: string | null; services: { name: string | null } | null } | null;
  customers: { full_name: string | null } | null;
};

/** flex-shrink-0 initial-letter avatar, matching the same treatment used across the customer/admin account menus. */
function InitialAvatar({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/20 text-primary text-label-md font-semibold"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

/**
 * The mobile/tablet card fallback for one appointment row -- all the same
 * information and actions the desktop table's row has, just stacked
 * instead of packed into table cells that would force horizontal
 * scrolling on a phone.
 */
export function AppointmentCardRow({ appointment }: { appointment: Row }) {
  const customerName = appointment.customers?.full_name ?? "—";
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <InitialAvatar name={customerName} />
          <div className="min-w-0">
            <p className="text-body-md font-semibold text-foreground truncate">{customerName}</p>
            <p className="text-label-sm text-on-surface-variant truncate">{appointment.primary_mobile}</p>
          </div>
        </div>
        <AppointmentStatusChip status={appointment.status} />
      </div>

      <div className="flex items-center gap-4 text-label-sm text-on-surface-variant">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
            calendar_month
          </span>
          {formatAppointmentDateShort(appointment.appointment_date)}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
            schedule
          </span>
          {appointment.appointment_slot_templates ? formatSlotTime(appointment.appointment_slot_templates.start_time) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant">
        <div className="min-w-0">
          <p className="text-body-md text-foreground truncate">{appointment.applications?.services?.name ?? "—"}</p>
          {appointment.application_id ? (
            <Link
              href={`/admin/dashboard/applications/${appointment.application_id}`}
              className="text-label-sm text-primary underline underline-offset-2"
            >
              {appointment.applications?.application_number ?? "View application"}
            </Link>
          ) : null}
        </div>
        <AppointmentStatusActions appointmentId={appointment.id} status={appointment.status} />
      </div>
    </div>
  );
}
