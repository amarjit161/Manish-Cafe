import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateAndHourToDate } from "@/lib/time";
import {
  calendarGrid,
  dateStr,
  monthLabel,
  monthParam,
  parseMonthParam,
  shiftMonth,
  todayDateStr,
} from "@/lib/calendar";
import { CallLink } from "@/components/admin/call-link";
import { StatusSelect } from "@/components/admin/status-select";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-yellow-400",
  CONFIRMED: "bg-blue-500",
  ACTIVE: "bg-green-500",
  COMPLETED: "bg-slate-400",
  CANCELLED: "bg-red-400",
};

function formatClock(d: Date) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDayHeading(dayStr: string) {
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const params = await searchParams;
  const monthKey = parseMonthParam(params.month);
  const today = todayDateStr();
  const selectedDay = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;

  const monthStart = dateAndHourToDate(dateStr(monthKey.year, monthKey.month, 1), 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      startAt: { gte: monthStart, lt: monthEnd },
      status: { not: "CANCELLED" },
    },
    include: { station: true },
    orderBy: { startAt: "asc" },
  });

  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = dateStr(b.startAt.getFullYear(), b.startAt.getMonth() + 1, b.startAt.getDate());
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(b);
  }

  const weeks = calendarGrid(monthKey);
  const prevParam = monthParam(shiftMonth(monthKey, -1));
  const nextParam = monthParam(shiftMonth(monthKey, 1));
  const selectedBookings = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-outline-variant/30">
        <div>
          <h1 className="text-headline-lg text-primary">Booking Calendar</h1>
          <p className="text-on-surface-variant text-sm">
            See how many gaming bookings are lined up on any day, at a glance.
          </p>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <Link
            href={`/admin/calendar?month=${prevParam}`}
            className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </Link>
          <h2 className="font-bold text-primary text-lg">{monthLabel(monthKey)}</h2>
          <Link
            href={`/admin/calendar?month=${nextParam}`}
            className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2 text-center text-xs font-bold uppercase text-on-surface-variant">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (day === null) {
                return <div key={`${wi}-${di}`} className="border-b border-r border-slate-50 min-h-24" />;
              }
              const key = dateStr(monthKey.year, monthKey.month, day);
              const dayBookings = byDay.get(key) ?? [];
              const isToday = key === today;
              const isSelected = key === selectedDay;
              return (
                <Link
                  key={key}
                  href={`/admin/calendar?month=${monthParam(monthKey)}&day=${key}`}
                  className={`min-h-24 border-b border-r border-slate-50 p-2 flex flex-col gap-1 hover:bg-surface-container-low transition-colors ${
                    isSelected ? "bg-primary-container/10 ring-1 ring-inset ring-primary" : ""
                  }`}
                >
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? "bg-primary text-white" : "text-on-surface"
                    }`}
                  >
                    {day}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container/15 text-secondary">
                      {dayBookings.length} booking{dayBookings.length > 1 ? "s" : ""}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {dayBookings.slice(0, 6).map((b) => (
                      <span
                        key={b.id}
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status] ?? "bg-slate-300"}`}
                      />
                    ))}
                  </div>
                </Link>
              );
            }),
          )}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-primary">{formatDayHeading(selectedDay)}</h3>
            <span className="text-xs font-bold text-on-surface-variant">
              {selectedBookings.length} booking{selectedBookings.length === 1 ? "" : "s"}
            </span>
          </div>
          {selectedBookings.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant">No bookings on this day.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Station</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-primary">{b.customerName}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{b.station.name}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {formatClock(b.startAt)} · {b.durationHours}h
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <CallLink phone={b.customerPhone} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <StatusSelect
                          id={b.id}
                          endpoint="/api/bookings"
                          currentStatus={b.status}
                          options={["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
