import { notFound } from "next/navigation";
import Link from "next/link";
import { getApplicationDetailForAdmin } from "@/lib/admin/queries";
import { ApplicationStageBadge } from "@/components/customer/status-badge";
import { AdminDocumentCard, DocumentHistoryRow } from "@/components/admin-dashboard/document-card";
import { AdminMessageThread } from "@/components/admin-dashboard/message-thread";
import { InternalNotes } from "@/components/admin-dashboard/internal-notes";
import { groupDocumentsByType } from "@/lib/applications/documents";
import { buildApplicationTimeline } from "@/lib/applications/timeline";
import { getApplicationProgress } from "@/lib/applications/progress";
import { isDocumentRequired } from "@/lib/applications/requirements";
import { formatRequestedUpdates } from "@/lib/applications/aadhaar-fields";
import { formatDate } from "@/lib/format";

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApplicationDetailForAdmin(id);
  if (!result) notFound();

  const { application, documents, history, messages, internalNotes, requiredDocs } = result;
  const timeline = buildApplicationTimeline({ history, documents });
  const grouped = groupDocumentsByType(documents);

  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const requestedUpdates = formatRequestedUpdates(answers);
  const contactMobile = typeof answers.contact_mobile === "string" ? answers.contact_mobile : "";
  const contactAltMobile = typeof answers.contact_alt_mobile === "string" ? answers.contact_alt_mobile : "";
  const progress = getApplicationProgress({
    applicationStatus: application.status,
    currentRequiredDocuments: requiredDocs
      .filter((rd) => isDocumentRequired(rd.condition_key, rd.is_mandatory, answers))
      .map((rd) => grouped.get(rd.document_type_id)?.current)
      .filter((doc): doc is NonNullable<typeof doc> => !!doc)
      .map((doc) => ({
        id: doc.id,
        documentTypeId: doc.document_type_id,
        status: doc.status,
        rejection_reason: doc.rejection_reason,
        reupload_message: doc.reupload_message,
        documentTypeName: doc.document_types?.name ?? "Document",
      })),
  });

  return (
    <div className="space-y-4">
      <Link href="/admin/dashboard/applications" className="text-label-sm text-primary underline">
        ← Back to Applications
      </Link>

      <div className="rounded-2xl bg-surface-container-low p-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-headline-md text-foreground">{application.services?.name ?? "Application"}</h1>
          <ApplicationStageBadge stage={progress.stage} />
        </div>
        <p className="text-label-sm text-on-surface-variant">
          {application.application_number ?? "Draft — not yet submitted"}
          {progress.stage !== application.status ? ` · raw status: ${application.status}` : ""}
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

      {requestedUpdates.length > 0 ? (
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-label-lg text-foreground">Requested updates</p>
          <p className="text-body-md text-foreground mt-1">{requestedUpdates.join(", ")}</p>
        </div>
      ) : null}

      {contactMobile ? (
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-label-lg text-foreground">Contact</p>
          <p className="text-body-md text-foreground mt-1">{contactMobile}</p>
          {contactAltMobile ? (
            <p className="text-body-md text-on-surface-variant">Alternative: {contactAltMobile}</p>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Documents</h2>
        {grouped.size === 0 ? (
          <p className="text-body-md text-on-surface-variant">No documents uploaded for this application.</p>
        ) : (
          <div className="space-y-3">
            {[...grouped.values()].map(({ current, history: olderVersions }) => (
              <div key={current.id} className="space-y-1.5">
                <p className="text-label-sm font-semibold text-primary uppercase tracking-wide">Current version</p>
                <AdminDocumentCard document={current} applicationId={application.id} />
                {olderVersions.length > 0 ? (
                  <details className="pl-2">
                    <summary className="cursor-pointer text-label-sm font-medium text-on-surface-variant">
                      Previous versions ({olderVersions.length}) — read only, kept for audit history
                    </summary>
                    <div className="mt-1.5 space-y-1.5">
                      {olderVersions.map((doc) => (
                        <DocumentHistoryRow key={doc.id} document={doc} />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Messages</h2>
        <AdminMessageThread applicationId={application.id} messages={messages} />
      </section>

      <InternalNotes applicationId={application.id} notes={internalNotes} />

      <details className="space-y-2">
        <summary className="cursor-pointer text-label-lg text-foreground">Activity history</summary>
        {timeline.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No activity recorded yet.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {timeline.map((event, i) => (
              <li
                key={`${event.at}-${i}`}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-body-md text-foreground">{event.title}</p>
                  {event.detail ? <p className="text-label-sm text-on-surface-variant">{event.detail}</p> : null}
                </div>
                <span className="text-label-sm text-on-surface-variant whitespace-nowrap">{formatDate(event.at)}</span>
              </li>
            ))}
          </ol>
        )}
      </details>
    </div>
  );
}
