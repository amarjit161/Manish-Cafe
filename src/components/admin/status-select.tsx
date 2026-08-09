"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-green-700",
  NEW: "bg-red-100 text-red-700",
  FOLLOW_UP: "bg-yellow-100 text-yellow-700",
  ENROLLED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-200 text-slate-600",
};

export function StatusSelect({
  id,
  endpoint,
  currentStatus,
  options,
}: {
  id: string;
  endpoint: string;
  currentStatus: string;
  options: string[];
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const style = STATUS_STYLES[currentStatus] ?? "bg-slate-100 text-slate-600";

  async function handleChange(status: string) {
    if (status === currentStatus) return;
    setUpdating(true);
    try {
      await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <select
      value={currentStatus}
      disabled={updating}
      onChange={(e) => handleChange(e.target.value)}
      className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-tighter border-0 outline-none cursor-pointer ${style} disabled:opacity-60`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
