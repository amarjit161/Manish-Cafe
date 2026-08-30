"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatus } from "@/lib/admin/actions";
import type { Database } from "@/lib/supabase/database.types";

type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

const NEXT_ACTIONS: Record<AppointmentStatus, { label: string; status: AppointmentStatus }[]> = {
  booked: [
    { label: "Mark completed", status: "completed" },
    { label: "Mark no-show", status: "no_show" },
    { label: "Cancel", status: "cancelled" },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function AppointmentStatusActions({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actions = NEXT_ACTIONS[status];
  if (actions.length === 0) return null;

  function apply(next: AppointmentStatus) {
    setError(null);
    startTransition(async () => {
      // The result was previously discarded here -- a failed update (e.g.
      // a database permission error) looked identical to a successful one,
      // since router.refresh() ran either way. Now a real failure is
      // actually shown, not silently swallowed.
      const result = await updateAppointmentStatus(appointmentId, next);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <button
            key={a.status}
            type="button"
            disabled={isPending}
            onClick={() => apply(a.status)}
            className="min-h-11 rounded-lg border border-outline-variant px-3 text-label-sm font-medium text-foreground hover:bg-surface-container-low transition-colors disabled:opacity-60"
          >
            {isPending ? "Saving…" : a.label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-label-sm text-error max-w-55">
          {error}
        </p>
      ) : null}
    </div>
  );
}
