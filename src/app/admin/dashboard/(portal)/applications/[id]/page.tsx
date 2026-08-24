import { notFound } from "next/navigation";
import Link from "next/link";
import { getApplicationDetailForAdmin } from "@/lib/admin/queries";
import { StatusBadge, DocumentStatusBadge } from "@/components/customer/status-badge";
import { AdminDocumentPreview } from "@/components/admin-dashboard/document-preview";
import { DocumentReviewActions } from "@/components/admin-dashboard/document-review-actions";
import { AdminMessageThread } from "@/components/admin-dashboard/message-thread";
import { InternalNotes } from "@/components/admin-dashboard/internal-notes";
import { buildApplicationTimeline } from "@/lib/applications/timeline";
import { formatDate } from "@/lib/format";

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApplicationDetailForAdmin(id);
  if (!result) notFound();

  const { application, documents, history, messages, internalNotes } = result;
  const timeline = buildApplicationTimeline({ history, documents });

  return (
    <div className="space-y-4">
      <Link href="/admin/dashboard/applications" className="text-label-sm text-primary underline">
        ← Back to Applications
      </Link>

      <div className="rounded-2xl bg-surface-container-low p-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-headline-md text-foreground">{application.services?.name ?? "Application"}</h1>
          <StatusBadge status={application.status} />
        </div>
        <p className="text-label-sm text-on-surface-variant">
          {application.application_number ?? "Draft — not yet submitted"}
        </p>
        <p className="text-body-md text-foreground">
          Customer: {application.customers?.full_name ?? "—"}
          {application.customers?.email ? ` (${application.customers.email})` : ""}
        </p>
        {application.customers?.phone ? (
          <p className="text-body-md text-on-surface-variant">Phone: {application.customers.phone}</p>
        ) : null}
        <p className="text-body-md text-on-surface-variant">Created {formatDate(application.created_at)}</p>
        <p className="text-body-md text-on-surface-variant">Last updated {formatDate(application.updated_at)}</p>
        <p className="text-headline-md text-foreground">₹{application.customer_price_snapshot}</p>
        {application.notes ? (
          <p className="text-body-md text-on-surface-variant">Notes: {application.notes}</p>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No documents uploaded for this application.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-body-md text-foreground">
                      {doc.document_types?.name ?? doc.document_types?.code}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {doc.original_filename} · uploaded {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </div>

                {doc.status !== "deleted" ? (
                  <AdminDocumentPreview documentId={doc.id} mimeType={doc.mime_type} />
                ) : null}

                {doc.status === "rejected" && doc.rejection_reason ? (
                  <p className="text-label-sm text-error">Rejection reason: {doc.rejection_reason}</p>
                ) : null}
                {doc.status === "reupload_required" && doc.reupload_message ? (
                  <p className="text-label-sm text-error">Re-upload requested: {doc.reupload_message}</p>
                ) : null}

                {doc.status !== "deleted" ? (
                  <DocumentReviewActions documentId={doc.id} applicationId={application.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Messages</h2>
        <AdminMessageThread applicationId={application.id} messages={messages} />
      </section>

      <InternalNotes applicationId={application.id} notes={internalNotes} />

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {timeline.map((event, i) => (
              <li
                key={`${event.at}-${i}`}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 flex items-center justify-between gap-3"
              >
                <span className="text-body-md text-foreground">{event.label}</span>
                <span className="text-label-sm text-on-surface-variant whitespace-nowrap">{formatDate(event.at)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
