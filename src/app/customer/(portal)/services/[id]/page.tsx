import { notFound } from "next/navigation";
import { getService } from "@/lib/customer/queries";
import { ApplyButton } from "@/components/customer/apply-button";
import { AADHAAR_UPDATE_FIELDS } from "@/lib/applications/aadhaar-fields";

/**
 * Overview only -- no interactive document checklist here. What's
 * actually required depends on answers the customer hasn't given yet
 * (e.g. Aadhaar's Address Proof), so an interactive checklist this early
 * would be misleading. The real checklist appears inside the guided
 * application flow (see /customer/applications/[id] while status=draft),
 * right after the relevant questions are answered. This page still gives
 * a plain read-only preview of what the service covers, so it doesn't
 * feel like a dead end before the customer commits to applying.
 */
export default async function CustomerServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();

  const isAadhaarUpdate = service.slug === "aadhaar-card-update";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-container-low p-6 space-y-2">
        <h1 className="text-headline-md text-foreground">{service.name}</h1>
        {service.description ? (
          <p className="text-body-md text-on-surface-variant">{service.description}</p>
        ) : null}
        <p className="text-headline-lg text-foreground mt-2">₹{service.customer_price}</p>
      </div>

      {isAadhaarUpdate ? (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4">
          <p className="text-label-lg text-foreground mb-2">What you can update</p>
          <p className="text-body-md text-on-surface-variant">
            {AADHAAR_UPDATE_FIELDS.map((f) => f.label).join(", ")}
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2">
        <p className="text-label-lg text-foreground">What happens next</p>
        <ol className="space-y-1 text-body-md text-on-surface-variant list-decimal pl-5">
          <li>Answer a few quick questions</li>
          <li>Upload the documents we need</li>
          <li>Review the price and submit</li>
          <li>We&rsquo;ll review it and keep you updated here</li>
        </ol>
      </div>

      <ApplyButton serviceId={service.id} />
    </div>
  );
}
