import { notFound } from "next/navigation";
import Link from "next/link";
import { getApplicationDetailForAdmin } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/customer/status-badge";
import { formatDate } from "@/lib/format";

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApplicationDetailForAdmin(id);
  if (!result) notFound();

  const { application, documents, history } = result;

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
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-body-md text-foreground">{doc.document_types?.name ?? doc.document_types?.code}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {doc.original_filename} · {formatDate(doc.uploaded_at)}
                  </p>
                </div>
                <span className="text-label-sm text-tertiary capitalize whitespace-nowrap">{doc.status}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-label-sm text-on-surface-variant italic">
          Document viewing/downloading is not yet implemented — only metadata is shown above. The
          underlying file lives in private Cloudflare R2 storage; no route currently exists to retrieve it
          for any role.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Timeline</h2>
        {history.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No status changes recorded yet.</p>
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
