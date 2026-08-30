import Link from "next/link";
import type { ActionRequiredItem } from "@/lib/applications/progress";

type Application = {
  id: string;
  application_number: string | null;
  services: { name: string | null } | null;
};

/**
 * The single highest-priority thing on the customer dashboard -- shown
 * only when getApplicationProgress() found a real rejected/reupload_required
 * document among the application's currently-required documents. Uses the
 * document's real rejection_reason/reupload_message when the admin left
 * one; otherwise falls back to plain, generic language (never invents a
 * specific reason that wasn't actually given). Deliberately customer-safe
 * wording throughout -- no "reject"/"approve"/"reupload_required" enum
 * leaks, matching the language used everywhere else in the customer portal.
 */
export function ActionRequiredCard({
  application,
  item,
}: {
  application: Application;
  item: ActionRequiredItem;
}) {
  const href = `/customer/applications/${application.application_number ?? application.id}`;
  const message = item.reason?.trim() || `Please upload your ${item.documentTypeName} again to continue.`;

  return (
    <Link
      href={href}
      className="block rounded-2xl bg-surface-container-lowest border border-warning/50 p-5 space-y-3 hover:border-warning transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-container px-2.5 py-1 text-label-sm font-medium text-on-warning-container">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            error
          </span>
          Action required
        </span>
        {application.application_number ? (
          <span className="text-label-sm text-on-surface-variant">ID: {application.application_number}</span>
        ) : null}
      </div>

      <div>
        <p className="text-body-lg font-semibold text-foreground">{application.services?.name ?? "Your application"}</p>
        <p className="text-body-md text-on-surface-variant mt-0.5">{message}</p>
      </div>

      <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary text-on-primary px-5 text-label-lg font-medium w-full sm:w-auto">
        Continue application
      </span>
    </Link>
  );
}
