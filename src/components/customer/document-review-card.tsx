import { DocumentUploadForm } from "@/components/customer/document-upload-form";
import { DocumentPreviewTrigger } from "@/components/customer/document-preview-modal";
import { buildDocumentGuidance } from "@/lib/documents/guidance";
import type { Database } from "@/lib/supabase/database.types";

type DocumentRow = {
  id: string;
  status: Database["public"]["Enums"]["document_status"];
  original_filename: string;
  mime_type: string;
  rejection_reason: string | null;
  reupload_message: string | null;
};

type DocumentTypeInfo = {
  id: string;
  name: string | null;
  description: string | null;
  allowed_mime_types: string[];
  max_file_size_bytes: number;
};

const ACTION_NEEDED_STATUSES = new Set(["rejected", "reupload_required"]);
const IN_REVIEW_STATUSES = new Set(["uploaded", "under_review"]);
const APPROVED_STATUSES = new Set(["approved", "verified"]);

/**
 * A document's full state for the customer, in plain language only --
 * never document_status/application_status enum values. Deliberately does
 * NOT reuse the admin's DocumentStatusBadge (that shows the real database
 * status, which is exactly what a customer shouldn't have to interpret).
 * "Approve"/"Reject"/"Request re-upload" never appear here; those are
 * admin-only actions.
 */
export function DocumentReviewCard({
  applicationId,
  documentType,
  current,
  currentlyRequired,
  canUpload,
}: {
  applicationId: string;
  documentType: DocumentTypeInfo;
  current: DocumentRow | undefined;
  currentlyRequired: boolean;
  canUpload: boolean;
}) {
  const name = documentType.name ?? "Document";

  if (!currentlyRequired) {
    return (
      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4">
        <p className="text-body-lg font-medium text-foreground">{name}</p>
        <p className="text-label-sm text-on-surface-variant mt-0.5">Not required for your application.</p>
      </div>
    );
  }

  const needsAction = current ? ACTION_NEEDED_STATUSES.has(current.status) : false;
  const isApproved = current ? APPROVED_STATUSES.has(current.status) : false;
  const isInReview = current ? IN_REVIEW_STATUSES.has(current.status) : false;
  const reason = current?.status === "rejected" ? current.rejection_reason : current?.reupload_message;

  if (!current) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 space-y-1.5">
        <p className="text-body-md font-medium text-foreground">{name}</p>
        <p className="text-label-sm text-on-surface-variant">
          {documentType.description ?? `Upload your ${name.toLowerCase()}.`}
        </p>
        <p className="text-label-sm text-on-surface-variant">
          {buildDocumentGuidance(documentType).slice(1).join(" · ")}
        </p>
        {canUpload ? (
          <DocumentUploadForm applicationId={applicationId} documentTypeId={documentType.id} label="Choose file" />
        ) : (
          <p className="text-label-sm text-error">Missing</p>
        )}
      </div>
    );
  }

  const isImage = current.mime_type.startsWith("image/");

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 ${
        needsAction ? "border-error bg-error-container/20" : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <p className="text-body-md font-medium text-foreground">{name}</p>

      <div className="flex items-center gap-3">
        <DocumentPreviewTrigger documentId={current.id} isImage={isImage} filename={current.original_filename} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-sm text-on-surface-variant">{current.original_filename}</p>
          {needsAction ? (
            <p className="text-label-sm font-semibold text-error">🔴 Action required</p>
          ) : isApproved ? (
            <p className="text-label-sm font-semibold text-success">✓ Approved</p>
          ) : isInReview ? (
            <p className="text-label-sm font-semibold text-foreground">⏳ Under review</p>
          ) : null}
        </div>
      </div>

      {needsAction && reason ? (
        <div className="space-y-0.5">
          <p className="text-label-sm font-medium text-on-surface-variant">Reason from Manish Cafe:</p>
          <p className="text-body-md text-foreground">&ldquo;{reason}&rdquo;</p>
        </div>
      ) : null}
      {isInReview ? (
        <p className="text-label-sm text-on-surface-variant">Our team is checking this document. No action needed from you.</p>
      ) : null}
      {isApproved ? <p className="text-label-sm text-on-surface-variant">Reviewed by Manish Cafe</p> : null}

      {canUpload ? (
        <DocumentUploadForm
          applicationId={applicationId}
          documentTypeId={documentType.id}
          label="Replace"
          variant={needsAction ? "primary" : "secondary"}
        />
      ) : null}
    </div>
  );
}
