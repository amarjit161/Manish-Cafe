import Link from "next/link";
import type { ApplicationProgress } from "@/lib/applications/progress";
import { ApplicationStageBadge } from "@/components/customer/status-badge";
import { formatRequestedUpdates } from "@/lib/applications/aadhaar-fields";

type Application = {
  id: string;
  application_number: string | null;
  answers: unknown;
  services: { name: string | null; slug?: string | null } | null;
};

const CTA_LABEL: Record<string, string> = {
  draft: "Continue application →",
  action_required: "Fix application →",
  completed: "View details →",
};

/**
 * The one card used everywhere an application is listed (dashboard,
 * applications list) -- so the language a customer sees never drifts
 * between pages. Status comes entirely from getApplicationProgress() via
 * ApplicationStageBadge; nothing here re-derives "what does this status
 * mean" on its own.
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
  const isCompleted = progress.terminal === "completed";
  const cta = needsAction ? CTA_LABEL.action_required : isDraft ? CTA_LABEL.draft : isCompleted ? CTA_LABEL.completed : "View application →";

  const requestedUpdates = formatRequestedUpdates(application.answers as Record<string, unknown> | null);

  return (
    <Link
      href={href}
      className="block rounded-xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-lg text-foreground font-medium">{application.services?.name ?? "Service"}</span>
        <ApplicationStageBadge stage={progress.stage} />
      </div>
      <p className="text-label-sm text-on-surface-variant">
        {application.application_number ?? "Draft — not yet submitted"}
      </p>

      {requestedUpdates.length > 0 ? (
        <p className="text-label-sm text-on-surface-variant truncate">{requestedUpdates.join(" · ")}</p>
      ) : null}

      {needsAction ? (
        <p className="text-body-md text-foreground">
          Your {progress.actionRequired[0].documentTypeName} needs to be replaced.
        </p>
      ) : null}

      <span className="inline-block text-label-sm font-medium text-primary">{cta}</span>
    </Link>
  );
}
