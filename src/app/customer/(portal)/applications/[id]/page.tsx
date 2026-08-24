import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/customer/queries";
import { StatusBadge } from "@/components/customer/status-badge";
import { SubmitApplicationButton } from "@/components/customer/submit-application-button";
import { DocumentReviewCard } from "@/components/customer/document-review-card";
import { AadhaarUpdateFieldsForm } from "@/components/customer/aadhaar-update-fields-form";
import { CustomerMessageThread } from "@/components/customer/message-thread";
import { ApplicationProgressView, ActionRequiredBanner } from "@/components/customer/application-progress";
import { isDocumentRequired } from "@/lib/applications/requirements";
import { computeApplicationProgress } from "@/lib/applications/progress";
import { groupDocumentsByType } from "@/lib/applications/documents";
import { buildApplicationTimeline } from "@/lib/applications/timeline";
import { formatDate } from "@/lib/format";

const UPLOADABLE_STATUSES = new Set(["draft", "submitted", "documents_required"]);

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
  const otherText = typeof answers.other_text === "string" ? answers.other_text : "";
  const canUpload = UPLOADABLE_STATUSES.has(application.status);

  const groupedDocs = groupDocumentsByType(documents);
  const requiredDocRows = requiredDocs.map((rd) => ({
    typeId: rd.document_type_id,
    docType: rd.document_types,
    currentlyRequired: isDocumentRequired(rd.condition_key, rd.is_mandatory, answers),
    current: groupedDocs.get(rd.document_type_id)?.current,
  }));

  const progress = computeApplicationProgress({
    applicationStatus: application.status,
    currentRequiredDocuments: requiredDocRows
      .filter((r) => r.currentlyRequired && r.current)
      .map((r) => ({
        id: r.current!.id,
        status: r.current!.status,
        rejection_reason: r.current!.rejection_reason,
        reupload_message: r.current!.reupload_message,
        documentTypeName: r.docType?.name ?? "Document",
      })),
  });

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

      <ActionRequiredBanner progress={progress} />

      {application.services?.slug === "aadhaar-card-update" ? (
        <AadhaarUpdateFieldsForm
          applicationId={application.id}
          initialFields={updateFields}
          initialOtherText={otherText}
          disabled={application.status !== "draft"}
        />
      ) : null}

      {application.status === "draft" ? <SubmitApplicationButton applicationId={application.id} /> : null}

      <ApplicationProgressView progress={progress} />

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Documents</h2>
        {requiredDocRows.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No documents required for this service.</p>
        ) : (
          <div className="space-y-2">
            {requiredDocRows.map((row) =>
              row.docType ? (
                <DocumentReviewCard
                  key={row.typeId}
                  applicationId={application.id}
                  documentType={row.docType}
                  current={row.current}
                  currentlyRequired={row.currentlyRequired}
                  canUpload={canUpload}
                />
              ) : null,
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Messages</h2>
        <CustomerMessageThread applicationId={application.id} messages={messages} />
      </section>

      <details className="space-y-2">
        <summary className="cursor-pointer text-label-lg text-foreground">Activity history</summary>
        {timeline.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No activity yet.</p>
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
