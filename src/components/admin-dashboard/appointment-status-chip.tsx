import { APPOINTMENT_STATUS_CHIP, type AppointmentStatus } from "@/lib/applications/appointments";

const TONE_CLASSES: Record<AppointmentStatus, string> = {
  booked: "bg-info-container text-on-info-container",
  completed: "bg-success-container text-on-success-container",
  cancelled: "bg-error-container text-on-error-container",
  no_show: "bg-warning-container text-on-warning-container",
};

const ICONS: Record<AppointmentStatus, string> = {
  booked: "event_available",
  completed: "check_circle",
  cancelled: "cancel",
  no_show: "error",
};

/** Soft pill, real canonical label (APPOINTMENT_STATUS_CHIP) -- icon + text, never color alone. */
export function AppointmentStatusChip({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-medium whitespace-nowrap ${TONE_CLASSES[status]}`}>
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        {ICONS[status]}
      </span>
      {APPOINTMENT_STATUS_CHIP[status]}
    </span>
  );
}
