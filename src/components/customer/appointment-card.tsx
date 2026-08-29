"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAppointment } from "@/lib/customer/actions";
import { AppointmentBooker } from "@/components/customer/appointment-booker";
import { formatAppointmentDate, formatSlotTime } from "@/lib/applications/appointments";

type Appointment = {
  id: string;
  application_id: string;
  service_id: string;
  appointment_date: string;
  primary_mobile: string;
  appointment_slot_templates: { start_time: string; end_time: string } | null;
};

/**
 * Full appointment view for the application detail page: confirmed
 * summary + Change/Cancel. "Change" swaps in the same booking UI used to
 * create the appointment in the first place (reschedule_appointment
 * atomically releases the old slot and reserves the new one).
 */
export function AppointmentCard({ appointment, requiredDocNames }: { appointment: Appointment; requiredDocNames: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "change" | "cancel">("view");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  if (mode === "change") {
    return (
      <div className="space-y-2">
        <AppointmentBooker
          applicationId={appointment.application_id}
          serviceId={appointment.service_id}
          initialPrimaryMobile={appointment.primary_mobile}
          initialAlternativeMobile=""
        />
        <button type="button" onClick={() => setMode("view")} className="text-label-sm font-medium text-on-surface-variant underline-offset-2 hover:underline">
          Keep current appointment
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-primary-container/40 border border-primary/20 p-4 space-y-2">
      <p className="text-label-lg font-semibold text-foreground">Your appointment</p>
      <p className="text-body-lg font-medium text-foreground">{formatAppointmentDate(appointment.appointment_date)}</p>
      {appointment.appointment_slot_templates ? (
        <p className="text-body-lg text-foreground">{formatSlotTime(appointment.appointment_slot_templates.start_time)}</p>
      ) : null}
      <p className="text-body-md text-on-surface-variant">Manish Cafe &amp; Cyber Zone</p>
      <p className="text-label-sm text-on-surface-variant">Please arrive a few minutes before your appointment.</p>
      {requiredDocNames.length > 0 ? (
        <p className="text-label-sm text-on-surface-variant">What to bring: {requiredDocNames.join(", ")}</p>
      ) : null}

      {mode === "cancel" ? (
        <div className="space-y-2 rounded-xl bg-surface-container-lowest p-3">
          <p className="text-body-md font-medium text-foreground">Cancel this appointment?</p>
          <p className="text-label-sm text-on-surface-variant">You can book another available time later.</p>
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
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
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => setMode("change")} className="text-label-sm font-medium text-primary">
            Change appointment
          </button>
          <button type="button" onClick={() => setMode("cancel")} className="text-label-sm font-medium text-error">
            Cancel appointment
          </button>
        </div>
      )}
    </div>
  );
}
