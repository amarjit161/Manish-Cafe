import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/customer/queries";
import { StatusBadge, DocumentStatusBadge } from "@/components/customer/status-badge";
import { SubmitApplicationButton } from "@/components/customer/submit-application-button";
import { DocumentUploadForm } from "@/components/customer/document-upload-form";
import { AadhaarUpdateFieldsForm } from "@/components/customer/aadhaar-update-fields-form";
import { CustomerMessageThread } from "@/components/customer/message-thread";
import { isDocumentRequired } from "@/lib/applications/requirements";
import { buildApplicationTimeline } from "@/lib/applications/timeline";
import { formatDate } from "@/lib/format";

const UPLOADABLE_STATUSES = new Set(["draft", "submitted", "documents_required"]);
const NON_CURRENT_DOCUMENT_STATUSES = new Set(["rejected", "reupload_required", "deleted"]);

export default async function CustomerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApplicationDetail(id);
  if (!result) notFound();

  const { application, requiredDocs, documents, history, messages } = result;
  const timeline = buildApplicationTimeline({ history, documents });
  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const updateFields = Array.isArray(answers.update_fields) ? (answers.update_fields as string[]) : [];
  const canUpload = UPLOADABLE_STATUSES.has(application.status);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-container-low p-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-headline-md text-foreground">{application.services?.name ?? "Application"}</h1>
          <StatusBadge status={application.status} />
        </div>
        <p className="text-label-sm text-on-surface-variant">
          {application.application_number ?? "Draft — not yet submitted"}
        </p>
        <p className="text-body-md text-on-surface-variant">Created {formatDate(application.created_at)}</p>
        <p className="text-headline-md text-foreground">₹{application.customer_price_snapshot}</p>
      </div>

      {application.services?.slug === "aadhaar-card-update" ? (
        <AadhaarUpdateFieldsForm
          applicationId={application.id}
          initialFields={updateFields}
          disabled={application.status !== "draft"}
        />
      ) : null}

      {application.status === "draft" ? <SubmitApplicationButton applicationId={application.id} /> : null}

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Documents</h2>
        {requiredDocs.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No documents required for this service.</p>
        ) : (
          <ul className="space-y-2">
            {requiredDocs.map((rd) => {
              const currentlyRequired = isDocumentRequired(rd.condition_key, rd.is_mandatory, answers);
              const latest = documents.find((d) => d.document_type_id === rd.document_type_id);
              const needsUpload = !latest || NON_CURRENT_DOCUMENT_STATUSES.has(latest.status);

              return (
                <li
                  key={rd.id}
                  className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body-md text-foreground">{rd.document_types?.name}</span>
                    {latest ? <DocumentStatusBadge status={latest.status} /> : null}
                  </div>

                  {!currentlyRequired ? (
                    <p className="text-label-sm text-on-surface-variant">Not required based on your answers.</p>
                  ) : latest?.status === "rejected" && latest.rejection_reason ? (
                    <p className="text-label-sm text-error">Rejected: {latest.rejection_reason}</p>
                  ) : latest?.status === "reupload_required" && latest.reupload_message ? (
                    <p className="text-label-sm text-error">Re-upload required: {latest.reupload_message}</p>
                  ) : null}

                  {currentlyRequired && needsUpload && canUpload ? (
                    <DocumentUploadForm
                      applicationId={application.id}
                      documentTypeId={rd.document_type_id}
                      label={latest ? "Replace" : "Upload"}
                    />
                  ) : currentlyRequired && !latest ? (
                    <span className="text-label-sm text-error">Missing</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Messages</h2>
        <CustomerMessageThread applicationId={application.id} messages={messages} />
      </section>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No activity yet.</p>
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
