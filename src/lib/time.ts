import { CAFE_CLOSE_HOUR, CAFE_OPEN_HOUR } from "@/lib/site-data";

/** Combine a "YYYY-MM-DD" date string and an hour (0-23) into a Date in local time. */
export function dateAndHourToDate(dateStr: string, hour: number): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, hour, 0, 0, 0);
}

/** List of bookable start hours for a day, e.g. [9, 10, ... 22] given a 9am-11pm cafe. */
export function availableStartHours(): number[] {
  const hours: number[] = [];
  for (let h = CAFE_OPEN_HOUR; h < CAFE_CLOSE_HOUR; h++) hours.push(h);
  return hours;
}

export function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h12}:00 ${suffix}`;
}

export function isValidDateStr(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(new Date(dateStr).getTime());
}

/** "2h 15m" / "45m" style duration label for a millisecond span (never negative). */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
