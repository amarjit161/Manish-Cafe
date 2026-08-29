import { format } from "date-fns";

export function formatDate(value: string) {
  return format(new Date(value), "dd MMM yyyy, h:mm a");
}

/**
 * Manish Cafe is a single physical location in India, so the greeting
 * always reflects Indian time regardless of which timezone the server
 * process happens to run in (Vercel's serverless functions run in UTC).
 */
export function getTimeOfDayGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}
