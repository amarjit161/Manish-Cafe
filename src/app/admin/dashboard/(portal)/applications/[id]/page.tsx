import { notFound } from "next/navigation";
import { getApplicationDetailForAdmin } from "@/lib/admin/queries";
import { BackLink } from "@/components/layout/back-link";
import { ApplicationStageBadge, StatusBadge } from "@/components/customer/status-badge";
import { AdminDocumentCard, DocumentHistoryRow } from "@/components/admin-dashboard/document-card";
import { AdminMessageThread } from "@/components/admin-dashboard/message-thread";
import { InternalNotes } from "@/components/admin-dashboard/internal-notes";
import { AppointmentSummaryCard } from "@/components/admin-dashboard/appointment-summary-card";
import { ApplicationProgressSteps } from "@/components/admin-dashboard/application-progress-steps";
import { groupDocumentsByType } from "@/lib/applications/documents";
import { buildApplicationTimeline } from "@/lib/applications/timeline";
import { getApplicationProgress } from "@/lib/applications/progress";
import { isDocumentRequired } from "@/lib/applications/requirements";
import { formatRequestedUpdates } from "@/lib/applications/aadhaar-fields";
import { formatDate } from "@/lib/format";

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-body-md">
      <dt className="text-on-surface-variant shrink-0">{label}</dt>
      <dd className="text-foreground text-right min-w-0">{value}</dd>
    </div>
  );
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApplicationDetailForAdmin(id);
  if (!result) notFound();

  const { application, documents, history, messages, internalNotes, requiredDocs, appointment } = result;
  const timeline = buildApplicationTimeline({ history, documents });
  const grouped = groupDocumentsByType(documents);

  const answers = (application.answers ?? {}) as Record<string, unknown>;
  const requestedUpdates = formatRequestedUpdates(answers);
  const mobileRegistered = typeof answers.mobile_registered === "string" ? answers.mobile_registered : null;
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

  const totalPrice = application.total_price_snapshot ?? application.customer_price_snapshot;

  return (
    <div className="space-y-6">
      <BackLink href="/admin/dashboard/applications" label="Back to Applications" />

      {/* Header */}
      <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">
              {application.services?.name ?? "Application"}
            </p>
            <h1 className="text-headline-lg text-foreground truncate">
              {application.application_number ?? "Draft — not yet submitted"}
            </h1>
            <p className="text-label-sm text-on-surface-variant mt-1">
              {application.submitted_at
                ? `Submitted ${formatDate(application.submitted_at)}`
                : `Created ${formatDate(application.created_at)}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <ApplicationStageBadge stage={progress.stage} />
            {progress.stage !== application.status ? (
              <div className="flex items-center gap-1.5">
                <span className="text-label-sm text-on-surface-variant">System status:</span>
                <StatusBadge status={application.status} />
              </div>
            ) : null}
          </div>
        </div>

        {progress.steps.length > 0 ? (
          <div className="mt-5 pt-5 border-t border-outline-variant">
            <ApplicationProgressSteps steps={progress.steps} />
          </div>
        ) : null}
      </div>

      {/* Summary: customer + application */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-2.5">
          <p className="text-label-lg font-semibold text-foreground">Customer</p>
          <dl className="space-y-2">
            <LabelValue label="Name" value={application.customers?.full_name ?? "—"} />
            {application.customers?.email ? (
              <LabelValue
                label="Email"
                value={
                  <a href={`mailto:${application.customers.email}`} className="text-primary hover:underline break-all">
                    {application.customers.email}
                  </a>
                }
              />
            ) : null}
            {application.customers?.phone ? (
              <LabelValue
                label="Phone"
                value={
                  <a href={`tel:${application.customers.phone}`} className="text-primary hover:underline">
                    {application.customers.phone}
                  </a>
                }
              />
            ) : null}
            {contactMobile ? (
              <LabelValue
                label="Contact number"
                value={
                  <a href={`tel:${contactMobile}`} className="text-primary hover:underline">
                    {contactMobile}
                  </a>
                }
              />
            ) : null}
            {contactAltMobile ? (
              <LabelValue
                label="Alternative"
                value={
                  <a href={`tel:${contactAltMobile}`} className="text-primary hover:underline">
                    {contactAltMobile}
                  </a>
                }
              />
            ) : null}
          </dl>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-2.5">
          <p className="text-label-lg font-semibold text-foreground">Application</p>
          <dl className="space-y-2">
            <LabelValue label="Application #" value={application.application_number ?? "Draft"} />
            <LabelValue label="Service" value={application.services?.name ?? "—"} />
            <LabelValue label="Created" value={formatDate(application.created_at)} />
            <LabelValue label="Amount" value={<span className="font-semibold">₹{totalPrice}</span>} />
          </dl>
          {application.notes ? (
            <p className="text-label-sm text-on-surface-variant pt-2 border-t border-outline-variant">
              Notes: {application.notes}
            </p>
          ) : null}
        </div>
      </div>

      {/* Requested updates */}
      {requestedUpdates.length > 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-label-lg font-semibold text-foreground mb-2">Requested updates</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {requestedUpdates.map((update) => (
              <li key={update} className="flex items-center gap-2 text-body-md text-foreground">
                <span className="material-symbols-outlined text-success text-[18px]" aria-hidden="true">
                  check_circle
                </span>
                {update}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Documents */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-label-lg font-semibold text-foreground">Documents</h2>
          {grouped.size > 0 ? (
            <span className="text-label-sm text-on-surface-variant">
              {grouped.size} type{grouped.size === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        {grouped.size === 0 ? (
          <p className="text-body-md text-on-surface-variant">No documents uploaded for this application.</p>
        ) : (
          <div className="space-y-4">
            {[...grouped.values()].map(({ current, history: olderVersions }) => (
              <div key={current.id} className="space-y-1.5">
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

      {/* Appointment */}
      <AppointmentSummaryCard appointment={appointment} mobileRegistered={mobileRegistered} />

      {/* Communication: customer conversation (left) + internal notes (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 flex flex-col">
          <h2 className="text-label-lg font-semibold text-foreground mb-3">Customer conversation</h2>
          <AdminMessageThread applicationId={application.id} messages={messages} />
        </section>

        <InternalNotes applicationId={application.id} notes={internalNotes} />
      </div>

      {/* Activity history */}
      <details className="space-y-2">
        <summary className="cursor-pointer text-label-lg font-semibold text-foreground">Activity history</summary>
        {timeline.length === 0 ? (
          <p className="text-body-md text-on-surface-variant mt-2">No activity recorded yet.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {timeline.map((event, i) => (
              <li
                key={`${event.at}-${i}`}
                className="rounded-lg bg-surface-container-lowest border border-outline-variant p-3 flex items-center gap-3"
              >
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
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
