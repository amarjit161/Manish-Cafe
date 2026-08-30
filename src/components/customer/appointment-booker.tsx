"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchAppointmentAvailability, bookAppointment, rescheduleAppointment } from "@/lib/customer/actions";
import { formatSlotTime, formatAppointmentDate } from "@/lib/applications/appointments";
import { SITE_NAME } from "@/lib/site-data";

type Availability = { slot_template_id: string; start_time: string; end_time: string; capacity: number; booked_count: number; remaining: number };

function nextDays(count: number): { value: string; label: string; weekday: string }[] {
  const days: { value: string; label: string; weekday: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({
      value,
      label: i === 0 ? "Today" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
    });
  }
  return days;
}

/** "10:00" -> "Morning" / "14:30" -> "Afternoon" / "18:00" -> "Evening" -- a pure presentational grouping over the real start_time already returned by get_appointment_availability(), never a separate data source. */
function periodOf(time: string): "Morning" | "Afternoon" | "Evening" {
  const hour = Number(time.split(":")[0]);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

/**
 * Date selection is local UI state -- no server call happens until the
 * customer actually lands on a date, at which point fetching real
 * availability IS one of the ticket's explicitly-allowed server calls
 * (never invented/hardcoded client-side). Booking itself goes through
 * book_appointment(), which re-verifies capacity server-side regardless
 * of what this component displays.
 *
 * Doubles as the reschedule flow when `reschedule` is passed: same date/
 * slot picker, but confirming calls reschedule_appointment() (via the
 * rescheduleAppointment action) instead of book_appointment() -- the two
 * RPCs have different preconditions (book_appointment refuses an
 * application that already has a booked appointment; reschedule_appointment
 * requires one). Contact-number fields are omitted in this mode since
 * reschedule_appointment() doesn't take or change them.
 */
export function AppointmentBooker({
  applicationId,
  serviceId,
  initialPrimaryMobile,
  initialAlternativeMobile,
  reschedule,
  onSuccess,
}: {
  applicationId: string;
  serviceId: string;
  initialPrimaryMobile: string;
  initialAlternativeMobile: string;
  /** Present only when this booker is being used to change an existing appointment. */
  reschedule?: { appointmentId: string; currentSlotTemplateId: string; currentDate: string };
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const days = nextDays(7);
  const [selectedDate, setSelectedDate] = useState(reschedule?.currentDate ?? days[0].value);
  // Tagging the fetched slots with the date they were fetched for (rather
  // than a separate `loading` boolean set synchronously inside the
  // effect) means "loading" is just "the data on hand isn't for the
  // currently selected date" -- derived, not a state update that runs on
  // every effect invocation.
  const [availability, setAvailability] = useState<{ date: string; slots: Availability[] } | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [primaryMobile, setPrimaryMobile] = useState(initialPrimaryMobile);
  const [alternativeMobile, setAlternativeMobile] = useState(initialAlternativeMobile);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAppointmentAvailability(serviceId, selectedDate).then((data) => {
      if (!cancelled) setAvailability({ date: selectedDate, slots: data as Availability[] });
    });
    return () => {
      cancelled = true;
    };
  }, [serviceId, selectedDate]);

  const loadingSlots = availability?.date !== selectedDate;
  const slotsForSelectedDate = loadingSlots ? null : availability!.slots;
  const selectedSlot = slotsForSelectedDate?.find((s) => s.slot_template_id === selectedSlotId) ?? null;

  const grouped =
    slotsForSelectedDate?.reduce<Record<string, Availability[]>>((acc, slot) => {
      const period = periodOf(slot.start_time);
      (acc[period] ??= []).push(slot);
      return acc;
    }, {}) ?? {};

  function chooseDate(value: string) {
    setSelectedDate(value);
    setSelectedSlotId(null);
    setError(null);
  }

  function confirmBooking() {
    if (!selectedSlotId || (!reschedule && !primaryMobile.trim()) || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = reschedule
        ? await rescheduleAppointment(reschedule.appointmentId, applicationId, {
            slotTemplateId: selectedSlotId,
            date: selectedDate,
          })
        : await bookAppointment(applicationId, {
            slotTemplateId: selectedSlotId,
            date: selectedDate,
            primaryMobile: primaryMobile.trim(),
            alternativeMobile: alternativeMobile.trim() || undefined,
          });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 rounded-2xl bg-surface-container-low p-4">
      <div>
        <p className="text-label-lg font-semibold text-foreground">
          {reschedule ? "Choose a new time" : "Choose your appointment"}
        </p>
        <p className="text-label-sm text-on-surface-variant mt-0.5">
          {reschedule
            ? "Pick a new date and time. Your contact details stay the same."
            : "Select a day and time that works for you -- we'll confirm it instantly."}
        </p>
        {/* Manish Cafe is a single physical location -- shown as plain
            real-name context, never a selector, since there is nothing to
            choose between and no street address exists anywhere in this
            app to show alongside it. */}
        <p className="flex items-center gap-1 text-label-sm text-on-surface-variant mt-1.5">
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
            location_on
          </span>
          {SITE_NAME}
        </p>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-label-sm font-medium text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            calendar_month
          </span>
          Select date
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => {
            const isSelected = day.value === selectedDate;
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => chooseDate(day.value)}
                aria-pressed={isSelected}
                aria-label={`${day.weekday} ${day.label}`}
                className={`flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-1.5 transition-colors ${
                  isSelected ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-foreground"
                }`}
              >
                <span className="text-label-sm">{day.weekday}</span>
                <span className="text-body-md font-medium">{day.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-label-sm font-medium text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            schedule
          </span>
          Select time slot
        </p>
        {loadingSlots ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-container-lowest" />
            ))}
          </div>
        ) : !slotsForSelectedDate || slotsForSelectedDate.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No appointments are available on this date. Try another day.</p>
        ) : (
          <div className="space-y-3">
            {(["Morning", "Afternoon", "Evening"] as const).map((period) =>
              grouped[period]?.length ? (
                <div key={period} className="space-y-1.5">
                  <p className="text-label-sm text-on-surface-variant">{period}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {grouped[period].map((slot) => {
                      const isCurrentSlot =
                        !!reschedule &&
                        slot.slot_template_id === reschedule.currentSlotTemplateId &&
                        selectedDate === reschedule.currentDate;
                      // The read-only availability preview counts every booked
                      // appointment for this slot, including the one being
                      // rescheduled -- so a customer's own current slot/date can
                      // read as "full" here even though reschedule_appointment()
                      // itself excludes their own appointment from its capacity
                      // check. Treating it as open (never disabled) keeps the UI
                      // truthful to what the RPC will actually allow.
                      const full = slot.remaining <= 0 && !isCurrentSlot;
                      const isSelected = selectedSlotId === slot.slot_template_id;
                      return (
                        <button
                          key={slot.slot_template_id}
                          type="button"
                          disabled={full}
                          onClick={() => setSelectedSlotId(slot.slot_template_id)}
                          aria-pressed={isSelected}
                          aria-label={
                            full
                              ? `${formatSlotTime(slot.start_time)}, fully booked`
                              : isCurrentSlot
                                ? `${formatSlotTime(slot.start_time)}, your current time`
                                : formatSlotTime(slot.start_time)
                          }
                          className={`min-h-11 rounded-lg border text-label-md font-medium transition-colors ${
                            full
                              ? "cursor-not-allowed border-outline-variant bg-surface-container-lowest text-on-surface-variant/50 line-through"
                              : isSelected
                                ? "border-primary bg-primary text-on-primary"
                                : "border-outline-variant bg-surface-container-lowest text-foreground"
                          }`}
                        >
                          {formatSlotTime(slot.start_time)}
                          {isCurrentSlot && !isSelected ? (
                            <span className="block text-[10px] font-normal opacity-80">Current</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>

      {selectedSlotId ? (
        <div className="space-y-4 border-t border-outline-variant pt-4">
          <div className="rounded-xl bg-primary-container/15 p-3 space-y-1.5">
            <p className="text-label-sm font-medium text-on-surface-variant">Review your appointment</p>
            <div className="flex items-center justify-between text-body-md">
              <span className="text-on-surface-variant">Date</span>
              <span className="font-semibold text-foreground">{formatAppointmentDate(selectedDate)}</span>
            </div>
            <div className="flex items-center justify-between text-body-md">
              <span className="text-on-surface-variant">Time</span>
              <span className="font-semibold text-foreground">{selectedSlot ? formatSlotTime(selectedSlot.start_time) : ""}</span>
            </div>
          </div>

          {!reschedule ? (
            <>
              <div className="space-y-1">
                <label className="text-label-sm text-on-surface-variant">
                  Mobile number <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={primaryMobile}
                  onChange={(e) => setPrimaryMobile(e.target.value)}
                  className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-label-sm text-on-surface-variant">Alternative mobile number (optional)</label>
                <input
                  type="tel"
                  value={alternativeMobile}
                  onChange={(e) => setAlternativeMobile(e.target.value)}
                  className="w-full min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-body-md text-foreground"
                />
              </div>
            </>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-error-container text-on-error-container text-label-sm px-3 py-2">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={confirmBooking}
            disabled={isPending || (!reschedule && !primaryMobile.trim())}
            className="flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-6 text-label-lg font-medium text-on-primary disabled:opacity-60"
          >
            {isPending ? (
              (reschedule ? "Saving…" : "Booking…")
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  check_circle
                </span>
                {reschedule ? "Confirm new time" : "Confirm appointment"}
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
