import { notFound } from "next/navigation";
import { getService } from "@/lib/customer/queries";
import { ApplyButton } from "@/components/customer/apply-button";

/**
 * Overview only -- no document checklist here. What's actually required
 * depends on answers the customer hasn't given yet (e.g. Aadhaar's Address
 * Proof), so showing a checklist this early would be misleading. The real
 * checklist appears inside the guided application flow, after the
 * relevant questions are answered.
 */
export default async function CustomerServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-surface-container-low p-6 space-y-2">
        <h1 className="text-headline-md text-foreground">{service.name}</h1>
        {service.description ? (
          <p className="text-body-md text-on-surface-variant">{service.description}</p>
        ) : null}
        <p className="text-headline-lg text-foreground mt-2">₹{service.customer_price}</p>
      </div>

      <ApplyButton serviceId={service.id} />
    </div>
  );
}
