"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchAppointmentAvailability, bookAppointment } from "@/lib/customer/actions";
import { formatSlotTime } from "@/lib/applications/appointments";

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

/**
 * Date selection is local UI state -- no server call happens until the
 * customer actually lands on a date, at which point fetching real
 * availability IS one of the ticket's explicitly-allowed server calls
 * (never invented/hardcoded client-side). Booking itself goes through
 * book_appointment(), which re-verifies capacity server-side regardless
 * of what this component displays.
 */
export function AppointmentBooker({
  applicationId,
  serviceId,
  initialPrimaryMobile,
  initialAlternativeMobile,
}: {
  applicationId: string;
  serviceId: string;
  initialPrimaryMobile: string;
  initialAlternativeMobile: string;
}) {
  const router = useRouter();
  const days = nextDays(7);
  const [selectedDate, setSelectedDate] = useState(days[0].value);
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

  function chooseDate(value: string) {
    setSelectedDate(value);
    setSelectedSlotId(null);
  }

  function confirmBooking() {
    if (!selectedSlotId || !primaryMobile.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await bookAppointment(applicationId, {
        slotTemplateId: selectedSlotId,
        date: selectedDate,
        primaryMobile: primaryMobile.trim(),
        alternativeMobile: alternativeMobile.trim() || undefined,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl bg-surface-container-low p-4">
      <div>
        <p className="text-label-lg text-foreground">Choose your appointment</p>
        <p className="text-label-sm text-on-surface-variant">Select a day that works for you.</p>
      </div>

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
              className={`flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-1.5 ${
                isSelected ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-foreground"
              }`}
            >
              <span className="text-label-sm">{day.weekday}</span>
              <span className="text-body-md font-medium">{day.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-label-sm font-medium text-on-surface-variant mb-1.5">Available times</p>
        {loadingSlots ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-container-lowest" />
            ))}
          </div>
        ) : !slotsForSelectedDate || slotsForSelectedDate.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No appointments are available on this date.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slotsForSelectedDate.map((slot) => {
              const full = slot.remaining <= 0;
              const isSelected = selectedSlotId === slot.slot_template_id;
              return (
                <button
                  key={slot.slot_template_id}
                  type="button"
                  disabled={full}
                  onClick={() => setSelectedSlotId(slot.slot_template_id)}
                  aria-pressed={isSelected}
                  aria-label={full ? `${formatSlotTime(slot.start_time)}, fully booked` : formatSlotTime(slot.start_time)}
                  className={`min-h-11 rounded-lg border text-label-md font-medium ${
                    full
                      ? "cursor-not-allowed border-outline-variant bg-surface-container-lowest text-on-surface-variant/50 line-through"
                      : isSelected
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant bg-surface-container-lowest text-foreground"
                  }`}
                >
                  {formatSlotTime(slot.start_time)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSlotId ? (
        <div className="space-y-3 border-t border-outline-variant pt-3">
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
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <button
            type="button"
            onClick={confirmBooking}
            disabled={isPending || !primaryMobile.trim()}
            className="flex w-full min-h-11 items-center justify-center rounded-lg bg-primary px-6 text-label-lg font-medium text-on-primary disabled:opacity-60"
          >
            {isPending ? "Booking…" : "Confirm appointment"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
