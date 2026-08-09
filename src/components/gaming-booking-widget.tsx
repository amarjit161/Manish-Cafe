"use client";

import { useEffect, useMemo, useState } from "react";
import { availableStartHours, formatHour } from "@/lib/time";
import { TiltCard } from "@/components/gsap/tilt-card";
import { Reveal } from "@/components/gsap/reveal";

type Station = {
  id: string;
  name: string;
  type: "PC" | "CONSOLE";
  specs: string;
  hourlyRate: number;
};

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function GamingBookingWidget({ stations }: { stations: Station[] }) {
  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [busyHours, setBusyHours] = useState<Set<number>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? null;
  const hours = useMemo(() => availableStartHours(), []);

  useEffect(() => {
    if (!selectedStationId || !date) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting UI state for a new fetch triggered by station/date change
    setLoadingSlots(true);
    setStartHour(null);
    fetch(`/api/bookings?stationId=${selectedStationId}&date=${date}`)
      .then((r) => r.json())
      .then((data: { bookings: { startAt: string; endAt: string }[] }) => {
        const busy = new Set<number>();
        for (const b of data.bookings ?? []) {
          const start = new Date(b.startAt);
          const end = new Date(b.endAt);
          for (let h = start.getHours(); h < end.getHours(); h++) busy.add(h);
        }
        setBusyHours(busy);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedStationId, date]);

  const isPastHour = (hour: number) => {
    const now = new Date();
    const todayStr = todayISO();
    if (date !== todayStr) return false;
    return hour <= now.getHours();
  };

  const consecutiveFree = (start: number, duration: number) => {
    for (let h = start; h < start + duration; h++) {
      if (!hours.includes(h) || busyHours.has(h) || isPastHour(h)) return false;
    }
    return true;
  };

  const total = selectedStation ? selectedStation.hourlyRate * durationHours : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStation || startHour === null) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selectedStation.id,
          customerName,
          customerPhone,
          date,
          startHour,
          durationHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? "Something went wrong" });
      } else {
        setResult({
          ok: true,
          message: `Booked! ${selectedStation.name} on ${date} from ${formatHour(startHour)} for ${durationHours}h. Total ₹${total}. Please arrive 5 minutes early — payment at counter.`,
        });
        setCustomerName("");
        setCustomerPhone("");
        setStartHour(null);
        setBusyHours((prev) => {
          const next = new Set(prev);
          for (let h = startHour; h < startHour + durationHours; h++) next.add(h);
          return next;
        });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
      {/* Station picker */}
      <div className="space-y-4">
        <h3 className="text-headline-md text-white">1. Choose a Station</h3>
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stations.map((station) => {
            const active = selectedStationId === station.id;
            return (
              <TiltCard key={station.id} maxTilt={6}>
                <button
                  type="button"
                  onClick={() => setSelectedStationId(station.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all backdrop-blur-sm ${
                    active
                      ? "border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
                      : "border-white/10 bg-white/3 hover:border-secondary-container/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{station.name}</span>
                    <span className={`material-symbols-outlined ${active ? "text-cyan-300" : "text-secondary-container"}`}>
                      {station.type === "PC" ? "desktop_windows" : "sports_esports"}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mb-2">{station.specs}</p>
                  <p className="text-sm font-bold text-secondary-container">₹{station.hourlyRate}/hr</p>
                </button>
              </TiltCard>
            );
          })}
        </Reveal>
      </div>

      {/* Booking form */}
      <div className="bg-white/4 backdrop-blur-md rounded-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.4)] p-6 space-y-6">
        <div>
          <h3 className="text-headline-md text-white mb-4">2. Pick Date &amp; Time</h3>
          <label className="block text-sm font-bold text-white/80 mb-2">Date</label>
          <input
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-white scheme-dark focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none mb-4"
          />

          <label className="block text-sm font-bold text-white/80 mb-2">Duration</label>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationHours(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                  durationHours === d
                    ? "bg-secondary-container text-white border-secondary-container shadow-[0_0_16px_rgba(253,118,26,0.5)]"
                    : "border-white/15 text-white/70 hover:border-secondary-container/60"
                }`}
              >
                {d}h
              </button>
            ))}
          </div>

          <label className="block text-sm font-bold text-white/80 mb-2">Start Time</label>
          {loadingSlots ? (
            <p className="text-sm text-white/50">Checking availability…</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {hours.map((h) => {
                const disabled = !consecutiveFree(h, durationHours);
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={disabled}
                    onClick={() => setStartHour(h)}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      disabled
                        ? "border-white/5 text-white/25 bg-white/2 cursor-not-allowed line-through"
                        : startHour === h
                          ? "bg-cyan-400 text-slate-900 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.6)]"
                          : "border-white/15 text-white/80 hover:border-cyan-400/60"
                    }`}
                  >
                    {formatHour(h)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-headline-md text-white">3. Your Details</h3>
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">Full Name</label>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">Phone Number</label>
            <input
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
            />
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10">
            <span className="text-sm font-semibold text-white/60">Total Amount</span>
            <span className="text-xl font-black text-secondary-container">₹{total}</span>
          </div>

          {result && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                result.ok
                  ? "bg-tertiary-container/15 text-tertiary-fixed-dim"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedStation || startHour === null || submitting}
            className="w-full py-3.5 bg-secondary-container text-white font-bold rounded-lg shadow-[0_0_24px_rgba(253,118,26,0.4)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {submitting ? "Booking…" : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
