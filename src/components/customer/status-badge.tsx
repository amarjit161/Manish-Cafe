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

type DocumentStatus = Database["public"]["Enums"]["document_status"];

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  uploaded: "bg-secondary-container text-on-secondary-container",
  under_review: "bg-secondary-container text-on-secondary-container",
  approved: "bg-tertiary text-on-tertiary",
  verified: "bg-tertiary text-on-tertiary",
  rejected: "bg-error-container text-on-error-container",
  reupload_required: "bg-error-container text-on-error-container",
  deleted: "bg-surface-container-high text-on-surface-variant",
};

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  under_review: "Under review",
  approved: "Approved",
  verified: "Verified",
  rejected: "Rejected",
  reupload_required: "Re-upload required",
  deleted: "Deleted",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-label-sm font-medium whitespace-nowrap ${DOCUMENT_STATUS_STYLES[status]}`}
    >
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}
