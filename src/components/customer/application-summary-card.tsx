import Link from "next/link";
import type { ApplicationProgress } from "@/lib/applications/progress";

type Application = {
  id: string;
  application_number: string | null;
  services: { name: string | null } | null;
};

/**
 * The one card used everywhere an application is listed (dashboard,
 * applications list) -- so the language a customer sees never drifts
 * between pages. Status text comes entirely from getApplicationProgress();
 * nothing here re-derives "what does this status mean" on its own.
 */
export function ApplicationSummaryCard({
  application,
  progress,
}: {
  application: Application;
  progress: ApplicationProgress;
}) {
  const href = `/customer/applications/${application.application_number ?? application.id}`;
  const isDraft = progress.stage === "draft";
  const needsAction = progress.actionRequired.length > 0;

  return (
    <Link
      href={href}
      className="block rounded-xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-lg text-foreground font-medium">{application.services?.name ?? "Service"}</span>
        {progress.terminal === "completed" ? (
          <span className="text-label-sm font-medium text-tertiary whitespace-nowrap">Completed ✓</span>
        ) : null}
      </div>
      <p className="text-label-sm text-on-surface-variant">
        {application.application_number ?? "Draft — not yet submitted"}
      </p>

      {needsAction ? (
        <div className="space-y-1">
          <p className="text-label-sm font-semibold text-error">🔴 Action required</p>
          <p className="text-body-md text-foreground">
            Your {progress.actionRequired[0].documentTypeName} needs to be replaced.
          </p>
        </div>
      ) : !progress.terminal ? (
        <p className="text-body-md text-on-surface-variant">
          {isDraft ? "Draft" : progress.stage === "processing" ? "We're processing your application" : "We're reviewing your application"}
        </p>
      ) : null}

      <span className="inline-block text-label-sm font-medium text-primary">
        {isDraft || needsAction ? "Continue →" : "View →"}
      </span>
    </Link>
  );
}
