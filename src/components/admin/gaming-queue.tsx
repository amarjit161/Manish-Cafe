import { formatDurationShort } from "@/lib/time";
import { StatusSelect } from "@/components/admin/status-select";
import { CallLink } from "@/components/admin/call-link";
import type { Booking, Station } from "@prisma/client";

type BookingWithStation = Booking & { station: Station };

function formatClock(d: Date) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function GamingQueue({ bookings, now }: { bookings: BookingWithStation[]; now: number }) {
  const nowPlaying = bookings
    .filter((b) => b.status === "ACTIVE")
    .sort((a, b) => a.endAt.getTime() - b.endAt.getTime());

  const waiting = bookings
    .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED")
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">sports_esports</span>
          Gaming Queue
        </h3>
        <span className="text-xs font-bold text-on-surface-variant">
          {nowPlaying.length} playing · {waiting.length} waiting
        </span>
      </div>

      {/* Now Playing */}
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-tertiary-container mb-2 px-2">
          Now Playing
        </p>
        {nowPlaying.length === 0 ? (
          <p className="text-sm text-on-surface-variant px-2 pb-2">No active sessions right now.</p>
        ) : (
          <div className="space-y-2">
            {nowPlaying.map((b) => {
              const remaining = b.endAt.getTime() - now;
              const overtime = remaining < 0;
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-primary truncate">{b.customerName}</p>
                    <p className="text-xs text-on-surface-variant mb-1">{b.station.name}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-semibold ${overtime ? "text-error" : "text-green-700"}`}>
                        {overtime
                          ? `Overtime by ${formatDurationShort(-remaining)}`
                          : `${formatDurationShort(remaining)} left · ends ${formatClock(b.endAt)}`}
                      </span>
                      <CallLink phone={b.customerPhone} />
                    </div>
                  </div>
                  <StatusSelect
                    id={b.id}
                    endpoint="/api/bookings"
                    currentStatus={b.status}
                    options={["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Waiting Queue */}
      <div className="p-4 pt-0">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2 px-2">
          Waiting Queue
        </p>
        {waiting.length === 0 ? (
          <p className="text-sm text-on-surface-variant px-2 pb-2">No one waiting.</p>
        ) : (
          <div className="space-y-2">
            {waiting.map((b, i) => {
              const startsIn = b.startAt.getTime() - now;
              const isDue = startsIn <= 0;
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-lg px-4 py-3"
                >
                  <span className="flex-none w-6 h-6 rounded-full bg-secondary-container text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-primary truncate">{b.customerName}</p>
                    <p className="text-xs text-on-surface-variant mb-1">
                      {b.station.name} · {b.durationHours}h
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-secondary">
                        {isDue
                          ? `Due now · ${formatClock(b.startAt)}`
                          : `Starts in ${formatDurationShort(startsIn)} · ${formatClock(b.startAt)}`}
                      </span>
                      <CallLink phone={b.customerPhone} />
                    </div>
                  </div>
                  <StatusSelect
                    id={b.id}
                    endpoint="/api/bookings"
                    currentStatus={b.status}
                    options={["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
