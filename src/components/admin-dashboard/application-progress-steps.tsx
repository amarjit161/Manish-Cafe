import type { ProgressStep } from "@/lib/applications/progress";

const STATE_STYLES: Record<ProgressStep["state"], { dot: string; text: string }> = {
  done: { dot: "bg-success text-on-success", text: "text-foreground" },
  current: { dot: "bg-primary text-on-primary", text: "text-primary font-semibold" },
  upcoming: { dot: "bg-surface-container-high text-on-surface-variant", text: "text-on-surface-variant" },
};

/**
 * Renders the same four steps getApplicationProgress() already computes
 * (Application / Documents / Review / Processing-or-Completed) -- this is
 * purely a visual rendering of that one canonical calculation, not a
 * second status system. A terminal application (completed/rejected/
 * cancelled) has no steps at all (see getApplicationProgress), so this
 * renders nothing for those -- the status badge already says everything
 * needed at that point.
 */
export function ApplicationProgressSteps({ steps }: { steps: ProgressStep[] }) {
  if (steps.length === 0) return null;

  return (
    <ol className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
      {steps.map((step, i) => {
        const style = STATE_STYLES[step.state];
        return (
          <li key={step.label} className="flex sm:flex-1 sm:flex-col items-center sm:items-stretch gap-3 sm:gap-2">
            <div className="flex items-center sm:w-full">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-sm font-bold ${style.dot}`}
                aria-hidden="true"
              >
                {step.state === "done" ? (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                ) : (
                  i + 1
                )}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={`hidden sm:block h-0.5 flex-1 ${step.state === "done" ? "bg-success" : "bg-outline-variant"}`}
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <span className={`text-label-sm ${style.text}`}>
              {step.label}
              {step.state === "current" ? <span className="sr-only"> (current stage)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
