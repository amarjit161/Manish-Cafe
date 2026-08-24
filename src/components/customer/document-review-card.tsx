import { DocumentStatusBadge } from "@/components/customer/status-badge";
import { DocumentUploadForm } from "@/components/customer/document-upload-form";
import { buildDocumentGuidance } from "@/lib/documents/guidance";
import { formatDate } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

type DocumentRow = {
  id: string;
  status: Database["public"]["Enums"]["document_status"];
  uploaded_at: string;
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

/**
 * One document's full review state for the customer: what's required, why
 * (if anything is wrong), and the concrete replace action -- all in one
 * card so the customer never has to cross-reference the timeline to know
 * what to do next. The admin's exact rejection/re-upload wording is shown
 * verbatim (never paraphrased), and the "what to upload" checklist comes
 * entirely from document_types configuration (see buildDocumentGuidance),
 * not any hardcoded per-service copy.
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
        <p className="text-label-sm text-on-surface-variant">Not required based on your answers.</p>
      </div>
    );
  }

  const needsAction = current ? ACTION_NEEDED_STATUSES.has(current.status) : false;
  const reason = current?.status === "rejected" ? current.rejection_reason : current?.reupload_message;

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        needsAction ? "border-error bg-error-container/20" : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-lg font-medium text-foreground">{name}</p>
        {current ? <DocumentStatusBadge status={current.status} /> : null}
      </div>

      {!current ? (
        <>
          <ul className="list-disc pl-5 text-label-sm text-on-surface-variant space-y-0.5">
            {buildDocumentGuidance(documentType).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {canUpload ? (
            <DocumentUploadForm applicationId={applicationId} documentTypeId={documentType.id} label="Upload" />
          ) : (
            <p className="text-label-sm text-error">Missing</p>
          )}
        </>
      ) : needsAction ? (
        <>
          <p className="text-label-sm font-semibold text-error">❌ Action required</p>
          {reason ? (
            <div className="space-y-1">
              <p className="text-label-sm font-medium text-on-surface-variant">Why we need a new upload:</p>
              <p className="text-body-md text-foreground">&ldquo;{reason}&rdquo;</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-label-sm font-medium text-on-surface-variant">What to upload:</p>
            <ul className="list-disc pl-5 text-label-sm text-on-surface-variant space-y-0.5">
              {buildDocumentGuidance(documentType).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {canUpload ? (
            <DocumentUploadForm applicationId={applicationId} documentTypeId={documentType.id} label="Replace document" />
          ) : null}
        </>
      ) : IN_REVIEW_STATUSES.has(current.status) ? (
        <p className="text-label-sm text-on-surface-variant">
          New document uploaded on {formatDate(current.uploaded_at)}. Waiting for the Manish Cafe team to review it.
        </p>
      ) : current.status === "approved" || current.status === "verified" ? (
        <p className="text-label-sm text-tertiary font-medium">✓ Approved</p>
      ) : null}
    </div>
  );
}
