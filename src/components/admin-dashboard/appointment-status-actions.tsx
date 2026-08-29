"use client";

import { useTransition } from "react";
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

  const actions = NEXT_ACTIONS[status];
  if (actions.length === 0) return null;

  function apply(next: AppointmentStatus) {
    startTransition(async () => {
      await updateAppointmentStatus(appointmentId, next);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1.5">
      {actions.map((a) => (
        <button
          key={a.status}
          type="button"
          disabled={isPending}
          onClick={() => apply(a.status)}
          className="rounded-md border border-outline-variant px-2 py-1 text-label-sm text-foreground disabled:opacity-60"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
