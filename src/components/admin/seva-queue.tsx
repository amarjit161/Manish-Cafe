import { formatDurationShort } from "@/lib/time";
import { StatusSelect } from "@/components/admin/status-select";
import { CallLink } from "@/components/admin/call-link";
import type { SevaRequest } from "@prisma/client";

export function SevaQueue({ requests, now }: { requests: SevaRequest[]; now: number }) {
  const queue = requests
    .filter((r) => r.status === "PENDING" || r.status === "IN_PROGRESS")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const done = requests.filter((r) => r.status === "VERIFIED" || r.status === "COMPLETED");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">description</span>
          Seva Queue
        </h3>
        <span className="text-xs font-bold text-on-surface-variant">
          {queue.length} in queue
        </span>
      </div>

      <div className="p-4">
        {queue.length === 0 ? (
          <p className="text-sm text-on-surface-variant px-2 pb-2">No pending requests. All caught up.</p>
        ) : (
          <div className="space-y-2">
            {queue.map((r, i) => {
              const waitingFor = now - r.createdAt.getTime();
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3"
                >
                  <span className="flex-none w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-primary truncate">{r.applicantName}</p>
                    <p className="text-xs text-on-surface-variant mb-1">{r.serviceType}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-blue-700">
                        Waiting {formatDurationShort(waitingFor)}
                      </span>
                      <CallLink phone={r.phone} />
                    </div>
                  </div>
                  <StatusSelect
                    id={r.id}
                    endpoint="/api/seva"
                    currentStatus={r.status}
                    options={["PENDING", "IN_PROGRESS", "VERIFIED", "COMPLETED"]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-on-surface-variant">
            {done.length} completed today
          </p>
        </div>
      )}
    </div>
  );
}
