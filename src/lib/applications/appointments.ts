import type { Database } from "@/lib/supabase/database.types";

export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

/** Never the raw enum in customer-facing copy. */
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: "Appointment confirmed",
  completed: "Appointment completed",
  cancelled: "Appointment cancelled",
  no_show: "Missed appointment",
};

/** Short chip text, for cards where space is tight. */
export const APPOINTMENT_STATUS_CHIP: Record<AppointmentStatus, string> = {
  booked: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "10:00" (24h, from Postgres `time`) -> "10:00 AM". */
export function formatSlotTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${pad(Number(mStr))} ${period}`;
}

/** "2026-08-31" -> "Monday, 31 August 2026". */
export function formatAppointmentDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Compact form for cards: "31 Aug". */
export function formatAppointmentDateShort(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** YYYY-MM-DD in the server's local sense of "today" -- used as the earliest bookable date. */
export function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Picks the one appointment row a UI should treat as "the" appointment for
 * an application, given that `appointments.application_id` is NOT unique --
 * a customer can cancel and rebook, leaving a real history of rows (e.g.
 * one `cancelled` + one `booked`) for the same application. Prefers the
 * `booked` row (there can only ever be one at a time, per book_appointment()'s
 * own check); falls back to the most recent by date otherwise (e.g. every
 * row is cancelled/completed). Shared by both the admin and customer query
 * modules so this resolution never drifts between the two portals -- and so
 * neither ever reaches for `.maybeSingle()` on this table, which errors
 * outright as soon as a customer has more than one appointment row.
 */
export function pickCurrentAppointment<T extends { status: string; appointment_date: string }>(
  raw: T | T[] | null | undefined,
): T | null {
  const appointments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return (
    appointments.find((a) => a.status === "booked") ??
    [...appointments].sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))[0] ??
    null
  );
}
