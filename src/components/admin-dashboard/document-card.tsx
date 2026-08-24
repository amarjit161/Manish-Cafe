import { DocumentStatusBadge } from "@/components/customer/status-badge";
import { AdminDocumentPreview } from "@/components/admin-dashboard/document-preview";
import { DocumentReviewActions } from "@/components/admin-dashboard/document-review-actions";
import { formatDate } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

type Document = {
  id: string;
  original_filename: string;
  mime_type: string;
  uploaded_at: string;
  status: Database["public"]["Enums"]["document_status"];
  rejection_reason: string | null;
  reupload_message: string | null;
  document_types?: { name: string | null; code: string | null } | null;
};

/**
 * The one interactive, "current" document row for a given document type --
 * the only row review actions are ever allowed to apply to (see
 * loadReviewableDocument in admin/actions.ts). Older versions of the same
 * document type render separately, read-only, via DocumentHistoryRow.
 */
export function AdminDocumentCard({ document, applicationId }: { document: Document; applicationId: string }) {
  const name = document.document_types?.name ?? document.document_types?.code ?? "Document";

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body-lg font-medium text-foreground">{name}</p>
          <p className="text-label-sm text-on-surface-variant">
            {document.original_filename} · uploaded {formatDate(document.uploaded_at)}
          </p>
        </div>
        <DocumentStatusBadge status={document.status} />
      </div>

      {document.status === "rejected" && document.rejection_reason ? (
        <p className="rounded-lg bg-error-container/40 px-3 py-2 text-label-sm text-error">
          Rejection reason: {document.rejection_reason}
        </p>
      ) : null}
      {document.status === "reupload_required" && document.reupload_message ? (
        <p className="rounded-lg bg-error-container/40 px-3 py-2 text-label-sm text-error">
          Message: {document.reupload_message}
        </p>
      ) : null}

      {document.status !== "deleted" ? (
        <AdminDocumentPreview documentId={document.id} mimeType={document.mime_type} />
      ) : null}

      <DocumentReviewActions documentId={document.id} applicationId={applicationId} status={document.status} />
    </div>
  );
}

/**
 * A superseded version of a document -- kept purely for the audit trail.
 * No review actions render here at all, matching the server-side rule that
 * only the current row for a document type can be acted on.
 */
export function DocumentHistoryRow({ document }: { document: Document }) {
  const name = document.document_types?.name ?? document.document_types?.code ?? "Document";
  return (
    <div className="rounded-lg bg-surface-container-low border border-outline-variant/60 p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-body-md text-on-surface-variant">
          {name} · {document.original_filename}
        </p>
        <p className="text-label-sm text-on-surface-variant">Uploaded {formatDate(document.uploaded_at)} · superseded</p>
      </div>
      <DocumentStatusBadge status={document.status} />
    </div>
  );
}
