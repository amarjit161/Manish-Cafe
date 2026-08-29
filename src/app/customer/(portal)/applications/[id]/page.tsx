import { notFound } from "next/navigation";
import Link from "next/link";
import { getApplicationDetail, getMyCustomer } from "@/lib/customer/queries";
import { ApplicationStageBadge } from "@/components/customer/status-badge";
import { DocumentReviewCard } from "@/components/customer/document-review-card";
import { AadhaarUpdateFieldsForm } from "@/components/customer/aadhaar-update-fields-form";
import { DeleteApplicationButton } from "@/components/customer/delete-application-button";
import { ApplicationReview } from "@/components/customer/application-review";
import { CustomerMessageThread } from "@/components/customer/message-thread";
import {
  ApplicationProgressView,
  ActionRequiredBanner,
  NoActionRequiredBanner,
} from "@/components/customer/application-progress";
import { isDocumentRequired } from "@/lib/applications/requirements";
import { getApplicationProgress } from "@/lib/applications/progress";
import { computePriceBreakdown } from "@/lib/applications/pricing";
import { groupDocumentsByType } from "@/lib/applications/documents";
import { buildApplicationTimeline } from "@/lib/applications/timeline";
import { formatDate } from "@/lib/format";
import type { MobileRegisteredAnswer } from "@/lib/applications/aadhaar-fields";

const UPLOADABLE_STATUSES = new Set(["draft", "submitted", "documents_required"]);
const NON_CURRENT_DOCUMENT_STATUSES = new Set(["rejected", "reupload_required", "deleted"]);

export default async function CustomerApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const [result, customer] = await Promise.all([getApplicationDetail(id), getMyCustomer()]);
  if (!result) notFound();

  const { application, requiredDocs, documents, history, messages, extraCharges } = result;

  if (submitted === "1" && application.status !== "draft") {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-headline-lg text-tertiary">✓</p>
        <h1 className="text-headline-md text-foreground">Application submitted</h1>
        <p className="text-body-md text-on-surface-variant">Your application has been received.</p>
        <div className="rounded-2xl bg-surface-container-low p-4 inline-block">
          <p className="text-label-sm text-on-surface-variant">Application number</p>
          <p className="text-headline-md text-foreground">{application.application_number}</p>
        </div>
        <p className="text-body-md text-on-surface-variant">
          We&rsquo;ll review your information and update you here.
        </p>
        <Link
          href={`/customer/applications/${application.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary text-on-primary px-6 text-label-lg font-medium"
        >
          View application
        </Link>
      </div>
    );
  }
  const timeline = buildApplicationTimeline({ history, documents });
  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const updateFields = Array.isArray(answers.update_fields) ? (answers.update_fields as string[]) : [];
  const otherText = typeof answers.other_text === "string" ? answers.other_text : "";
  const mobileRegistered = (answers.mobile_registered as MobileRegisteredAnswer | undefined) ?? null;
  const contactMobile = typeof answers.contact_mobile === "string" ? answers.contact_mobile : (customer?.phone ?? "");
  const contactAltMobile = typeof answers.contact_alt_mobile === "string" ? answers.contact_alt_mobile : "";
  const contactEmail = typeof answers.contact_email === "string" ? answers.contact_email : (customer?.email ?? "");
  const canUpload = UPLOADABLE_STATUSES.has(application.status);
  const isDraft = application.status === "draft";
  const isAadhaarUpdate = application.services?.slug === "aadhaar-card-update";

  const groupedDocs = groupDocumentsByType(documents);
  const requiredDocRows = requiredDocs.map((rd) => ({
    typeId: rd.document_type_id,
    docType: rd.document_types,
    currentlyRequired: isDocumentRequired(rd.condition_key, rd.is_mandatory, answers),
    current: groupedDocs.get(rd.document_type_id)?.current,
  }));
  const aadhaarDocRequirements = requiredDocs.map((rd) => ({
    typeId: rd.document_type_id,
    name: rd.document_types?.name ?? "Document",
    conditionKey: rd.condition_key,
    isMandatory: rd.is_mandatory,
  }));

  const progress = getApplicationProgress({
    applicationStatus: application.status,
    currentRequiredDocuments: requiredDocRows
      .filter((r) => r.currentlyRequired && r.current)
      .map((r) => ({
        id: r.current!.id,
        documentTypeId: r.typeId,
        status: r.current!.status,
        rejection_reason: r.current!.rejection_reason,
        reupload_message: r.current!.reupload_message,
        documentTypeName: r.docType?.name ?? "Document",
      })),
  });

  const liveBreakdown = computePriceBreakdown({ basePrice: application.customer_price_snapshot, answers, extraCharges });
  const displayedTotal = isDraft ? liveBreakdown.total : (application.total_price_snapshot ?? application.customer_price_snapshot);

  const documentCards = requiredDocRows.map((row) =>
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
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-container-low p-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-headline-md text-foreground">{application.services?.name ?? "Application"}</h1>
          <ApplicationStageBadge stage={progress.stage} />
        </div>
        <p className="text-label-sm text-on-surface-variant">
          {application.application_number ?? "Draft — not yet submitted"}
        </p>
        {!isDraft ? (
          <p className="text-body-md text-on-surface-variant">Created {formatDate(application.created_at)}</p>
        ) : null}
        <p className="text-headline-md text-foreground">₹{displayedTotal}</p>
      </div>

      {isDraft ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-body-md text-on-surface-variant">
              Choose what you need, answer a few questions, upload your documents, and submit.
            </p>
            <DeleteApplicationButton applicationId={application.id} />
          </div>

          {isAadhaarUpdate ? (
            <AadhaarUpdateFieldsForm
              applicationId={application.id}
              initialFields={updateFields}
              initialOtherText={otherText}
              initialMobileRegistered={mobileRegistered}
              initialContactMobile={contactMobile}
              initialContactAltMobile={contactAltMobile}
              initialContactEmail={contactEmail}
              basePrice={application.customer_price_snapshot}
              extraCharges={extraCharges}
              requiredDocs={aadhaarDocRequirements}
              disabled={!isDraft}
            />
          ) : null}

          <section id="documents-section" className="space-y-2 scroll-mt-4">
            <h2 className="text-label-lg text-foreground">Your documents</h2>
            <p className="text-body-md text-on-surface-variant">Based on your answers, you need these documents.</p>
            {requiredDocRows.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">No documents required for this service.</p>
            ) : (
              <div className="space-y-2">{documentCards}</div>
            )}
          </section>

          <ApplicationReview
            applicationId={application.id}
            serviceName={application.services?.name ?? "Service"}
            basePrice={application.customer_price_snapshot}
            answers={answers}
            extraCharges={extraCharges}
            showRequestedUpdates={isAadhaarUpdate}
            requiredDocs={requiredDocRows.map((r) => ({
              typeId: r.typeId,
              name: r.docType?.name ?? "Document",
              currentlyRequired: r.currentlyRequired,
              uploaded: !!r.current && !NON_CURRENT_DOCUMENT_STATUSES.has(r.current.status),
            }))}
          />
        </>
      ) : (
        <>
          <ActionRequiredBanner applicationId={application.id} progress={progress} canUpload={canUpload} />
          <NoActionRequiredBanner progress={progress} />

          <ApplicationProgressView progress={progress} />

          <section className="space-y-2">
            <h2 className="text-label-lg text-foreground">Your documents</h2>
            {requiredDocRows.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">No documents required for this service.</p>
            ) : (
              <div className="space-y-2">{documentCards}</div>
            )}
          </section>

          <section className="space-y-2">
            {messages.length > 0 ? <h2 className="text-label-lg text-foreground">Messages</h2> : null}
            <CustomerMessageThread applicationId={application.id} messages={messages} />
          </section>

          <details className="space-y-2">
            <summary className="cursor-pointer text-label-lg text-foreground">Application history</summary>
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
        </>
      )}
    </div>
  );
}
