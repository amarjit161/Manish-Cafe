import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/customer/queries";
import { StatusBadge } from "@/components/customer/status-badge";
import { SubmitApplicationButton } from "@/components/customer/submit-application-button";
import { DocumentUploadForm } from "@/components/customer/document-upload-form";
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

  const { application, requiredDocs, documents, history } = result;

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

      {application.status === "draft" ? <SubmitApplicationButton applicationId={application.id} /> : null}

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Documents</h2>
        {requiredDocs.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No documents required for this service.</p>
        ) : (
          <ul className="space-y-2">
            {requiredDocs.map((rd) => {
              const uploaded = documents.find((d) => d.document_type_id === rd.document_type_id);
              return (
                <li
                  key={rd.id}
                  className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 flex items-center justify-between"
                >
                  <span className="text-body-md text-foreground">{rd.document_types?.name}</span>
                  {uploaded ? (
                    <span className="text-label-sm text-tertiary capitalize">{uploaded.status}</span>
                  ) : UPLOADABLE_STATUSES.has(application.status) ? (
                    <DocumentUploadForm applicationId={application.id} documentTypeId={rd.document_type_id} />
                  ) : (
                    <span className="text-label-sm text-on-surface-variant">
                      {rd.is_mandatory ? "Missing" : "Not provided"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Timeline</h2>
        {history.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No status changes yet.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 flex items-center justify-between"
              >
                <StatusBadge status={h.new_status} />
                <span className="text-label-sm text-on-surface-variant">{formatDate(h.created_at)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
