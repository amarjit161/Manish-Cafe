"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAppointment } from "@/lib/customer/actions";
import { AppointmentBooker } from "@/components/customer/appointment-booker";
import { formatAppointmentDate, formatSlotTime, APPOINTMENT_STATUS_CHIP, type AppointmentStatus } from "@/lib/applications/appointments";

type Appointment = {
  id: string;
  application_id: string;
  service_id: string;
  slot_template_id: string;
  appointment_date: string;
  status: AppointmentStatus;
  primary_mobile: string;
  appointment_slot_templates: { start_time: string; end_time: string } | null;
};

/**
 * Full appointment view for the application detail page: confirmed
 * summary + Change/Cancel. "Change" opens a dialog with the same booking
 * UI used to create the appointment, but wired to reschedule_appointment()
 * (via AppointmentBooker's `reschedule` prop) rather than book_appointment()
 * -- the latter unconditionally refuses an application that already has a
 * booked appointment, so reusing it here would make every reschedule fail.
 */
export function AppointmentCard({ appointment, requiredDocNames }: { appointment: Appointment; requiredDocNames: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "change" | "cancel">("view");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "change") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMode("view");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  function confirmCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelAppointment(appointment.id, appointment.application_id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-primary-container/15 border border-primary/25 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-label-lg font-semibold text-foreground">
          <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">
            event_available
          </span>
          Your appointment
        </p>
        <span className="inline-flex items-center rounded-full bg-primary text-on-primary px-2.5 py-1 text-label-sm font-medium">
          {APPOINTMENT_STATUS_CHIP[appointment.status]}
        </span>
      </div>

      <div>
        <p className="text-body-lg font-semibold text-foreground">{formatAppointmentDate(appointment.appointment_date)}</p>
        {appointment.appointment_slot_templates ? (
          <p className="text-body-lg text-foreground">{formatSlotTime(appointment.appointment_slot_templates.start_time)}</p>
        ) : null}
      </div>

      <div className="space-y-0.5">
        <p className="text-body-md text-on-surface-variant">Manish Cafe &amp; Cyber Zone</p>
        <p className="text-label-sm text-on-surface-variant">Please arrive a few minutes before your appointment.</p>
        {requiredDocNames.length > 0 ? (
          <p className="text-label-sm text-on-surface-variant">What to bring: {requiredDocNames.join(", ")}</p>
        ) : null}
      </div>

      {mode === "cancel" ? (
        <div className="space-y-2 rounded-xl border border-error/30 bg-surface-container-lowest p-3">
          <p className="flex items-center gap-1.5 text-body-md font-medium text-foreground">
            <span className="material-symbols-outlined text-error text-[18px]" aria-hidden="true">
              warning
            </span>
            Cancel this appointment?
          </p>
          <p className="text-label-sm text-on-surface-variant">
            This slot will be released for other customers. You can book another available time later.
          </p>
          {error ? (
            <p role="alert" className="rounded-lg bg-error-container text-on-error-container text-label-sm px-3 py-2">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={isPending}
              className="flex-1 min-h-11 rounded-lg border border-outline-variant text-label-md font-medium text-foreground disabled:opacity-60"
            >
              Keep appointment
            </button>
            <button
              type="button"
              onClick={confirmCancel}
              disabled={isPending}
              className="flex-1 min-h-11 rounded-lg bg-error text-on-error text-label-md font-medium disabled:opacity-60"
            >
              {isPending ? "Cancelling…" : "Cancel appointment"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 pt-1">
          <button type="button" onClick={() => setMode("change")} className="text-label-sm font-medium text-primary">
            Change appointment
          </button>
          <button type="button" onClick={() => setMode("cancel")} className="text-label-sm font-medium text-error">
            Cancel appointment
          </button>
        </div>
      )}

      {mode === "change" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Change appointment"
          className="fixed inset-0 z-60 flex items-end justify-center bg-on-surface/40 p-0 sm:items-center sm:p-4"
          onClick={() => setMode("view")}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-body-lg font-semibold text-foreground">Change appointment</p>
              <button
                type="button"
                onClick={() => setMode("view")}
                aria-label="Close"
                autoFocus
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <AppointmentBooker
              applicationId={appointment.application_id}
              serviceId={appointment.service_id}
              initialPrimaryMobile={appointment.primary_mobile}
              initialAlternativeMobile=""
              reschedule={{
                appointmentId: appointment.id,
                currentSlotTemplateId: appointment.slot_template_id,
                currentDate: appointment.appointment_date,
              }}
              onSuccess={() => setMode("view")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
