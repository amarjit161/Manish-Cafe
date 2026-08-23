import type { Database } from "@/lib/supabase/database.types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-secondary-container text-on-secondary-container",
  under_review: "bg-secondary-container text-on-secondary-container",
  documents_required: "bg-error-container text-on-error-container",
  processing: "bg-tertiary-container text-on-tertiary-container",
  completed: "bg-tertiary text-on-tertiary",
  rejected: "bg-error-container text-on-error-container",
  cancelled: "bg-surface-container-high text-on-surface-variant",
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  documents_required: "Documents required",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
