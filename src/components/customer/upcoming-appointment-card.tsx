import Link from "next/link";
import { formatAppointmentDate, formatSlotTime } from "@/lib/applications/appointments";

type UpcomingAppointment = {
  application_id: string;
  appointment_date: string;
  appointment_slot_templates: { start_time: string } | null;
  applications: { application_number: string | null; services: { name: string | null } | null } | null;
};

/**
 * Read-only dashboard summary of the customer's soonest booked appointment
 * -- reschedule/cancel intentionally live only on the application detail
 * page's full AppointmentCard (via book_appointment/reschedule_appointment/
 * cancel_own_appointment), so this never duplicates that action surface or
 * touches booking logic. Only rendered when a real upcoming appointment
 * exists (getUpcomingAppointment already filters to status = "booked" and
 * appointment_date >= today) -- omitted entirely otherwise rather than
 * showing an empty-state filler, to keep the dashboard from feeling padded.
 */
export function UpcomingAppointmentCard({ appointment }: { appointment: UpcomingAppointment }) {
  const href = `/customer/applications/${appointment.applications?.application_number ?? appointment.application_id}`;

  return (
    <Link
      href={href}
      className="block rounded-2xl bg-primary-container/15 border border-primary/25 p-5 space-y-2 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[18px]">event_available</span>
        </span>
        <p className="text-label-lg font-semibold text-foreground">Upcoming appointment</p>
      </div>

      <p className="text-body-lg font-medium text-foreground">
        {appointment.applications?.services?.name ?? "Appointment"}
      </p>
      <p className="text-body-md text-on-surface-variant">
        {formatAppointmentDate(appointment.appointment_date)}
        {appointment.appointment_slot_templates ? ` · ${formatSlotTime(appointment.appointment_slot_templates.start_time)}` : ""}
      </p>

      <span className="inline-block text-label-sm font-medium text-primary pt-1">View appointment →</span>
    </Link>
  );
}
