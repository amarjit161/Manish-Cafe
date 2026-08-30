import { formatAppointmentDate, formatSlotTime, APPOINTMENT_STATUS_CHIP, type AppointmentStatus } from "@/lib/applications/appointments";

const MOBILE_REGISTERED_LABEL: Record<string, string> = {
  yes: "Registered",
  no: "Not registered",
  unknown: "Not sure",
  registered_other: "Registered to someone else",
};

const STATUS_TONE: Record<AppointmentStatus, string> = {
  booked: "bg-info-container text-on-info-container",
  completed: "bg-success-container text-on-success-container",
  cancelled: "bg-surface-container-high text-on-surface-variant",
  no_show: "bg-error-container text-on-error-container",
};

type Appointment = {
  appointment_date: string;
  status: AppointmentStatus;
  primary_mobile: string;
  alternative_mobile: string | null;
  appointment_slot_templates: { start_time: string; end_time: string } | null;
};

/**
 * Read-only -- status changes already have a real home (the Appointments
 * register's AppointmentStatusActions), so this stays a summary rather
 * than a second place to act on the same row.
 */
export function AppointmentSummaryCard({
  appointment,
  mobileRegistered,
}: {
  appointment: Appointment | null;
  mobileRegistered: string | null;
}) {
  if (!appointment) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]" aria-hidden="true">
          event_busy
        </span>
        <p className="text-body-md text-on-surface-variant">No appointment booked.</p>
      </div>
    );
  }

  const slot = appointment.appointment_slot_templates;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label-lg font-semibold text-foreground">Appointment</p>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm font-medium ${STATUS_TONE[appointment.status]}`}>
          {APPOINTMENT_STATUS_CHIP[appointment.status]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-md">
        <div>
          <dt className="text-label-sm text-on-surface-variant">Date</dt>
          <dd className="text-foreground">{formatAppointmentDate(appointment.appointment_date)}</dd>
        </div>
        <div>
          <dt className="text-label-sm text-on-surface-variant">Time</dt>
          <dd className="text-foreground">{slot ? `${formatSlotTime(slot.start_time)} – ${formatSlotTime(slot.end_time)}` : "—"}</dd>
        </div>
        <div>
          <dt className="text-label-sm text-on-surface-variant">Contact</dt>
          <dd className="text-foreground">
            <a href={`tel:${appointment.primary_mobile}`} className="text-primary hover:underline">
              {appointment.primary_mobile}
            </a>
          </dd>
        </div>
        {appointment.alternative_mobile ? (
          <div>
            <dt className="text-label-sm text-on-surface-variant">Alternative</dt>
            <dd className="text-foreground">
              <a href={`tel:${appointment.alternative_mobile}`} className="text-primary hover:underline">
                {appointment.alternative_mobile}
              </a>
            </dd>
          </div>
        ) : null}
        {mobileRegistered ? (
          <div>
            <dt className="text-label-sm text-on-surface-variant">Aadhaar mobile</dt>
            <dd className="text-foreground">{MOBILE_REGISTERED_LABEL[mobileRegistered] ?? mobileRegistered}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
