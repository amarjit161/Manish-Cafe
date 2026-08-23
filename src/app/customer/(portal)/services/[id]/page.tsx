import { notFound } from "next/navigation";
import { getServiceWithDocuments } from "@/lib/customer/queries";
import { ApplyButton } from "@/components/customer/apply-button";

export default async function CustomerServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getServiceWithDocuments(id);
  if (!result) notFound();

  const { service, requiredDocs } = result;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-container-low p-6 space-y-2">
        <h1 className="text-headline-md text-foreground">{service.name}</h1>
        {service.description ? (
          <p className="text-body-md text-on-surface-variant">{service.description}</p>
        ) : null}
        <p className="text-headline-md text-foreground">₹{service.customer_price}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-label-lg text-foreground">Required documents</h2>
        {requiredDocs.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No documents required for this service.</p>
        ) : (
          <ul className="space-y-2">
            {requiredDocs.map((rd) => (
              <li
                key={rd.id}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 flex items-center justify-between"
              >
                <span className="text-body-md text-foreground">{rd.document_types?.name}</span>
                {rd.is_mandatory ? (
                  <span className="text-label-sm text-error">Required</span>
                ) : (
                  <span className="text-label-sm text-on-surface-variant">Optional</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ApplyButton serviceId={service.id} />
    </div>
  );
}
