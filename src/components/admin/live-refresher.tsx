"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresher({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      router.refresh();
      setSecondsAgo(0);
    }, intervalMs);

    const tickTimer = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(tickTimer);
    };
  }, [router, intervalMs]);

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-container" />
      </span>
      Live · updated {secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}
    </div>
  );
}
