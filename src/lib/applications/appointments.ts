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
