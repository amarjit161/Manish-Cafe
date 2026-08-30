import { notFound } from "next/navigation";
import { getService } from "@/lib/customer/queries";
import { ApplyButton } from "@/components/customer/apply-button";
import { AADHAAR_UPDATE_FIELDS } from "@/lib/applications/aadhaar-fields";
import { BackLink } from "@/components/layout/back-link";
import { serviceIcon } from "@/components/customer/service-quick-card";

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
  const icon = serviceIcon(service.slug);

  return (
    <div className="space-y-4">
      <BackLink href="/customer/services" label="Back to Services" />

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container/15 text-primary"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
          </span>
          <div className="min-w-0">
            <h1 className="text-headline-md text-foreground">{service.name}</h1>
            {service.description ? (
              <p className="text-body-md text-on-surface-variant mt-1">{service.description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant">
          <p className="text-headline-lg text-foreground font-semibold">₹{service.customer_price}</p>
          {service.requires_appointment ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-container px-2.5 py-1 text-label-sm font-medium text-on-warning-container">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                event
              </span>
              Appointment required
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-container px-2.5 py-1 text-label-sm font-medium text-on-success-container">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                check_circle
              </span>
              No appointment needed
            </span>
          )}
        </div>
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
          {service.requires_appointment ? <li>Book a short appointment at Manish Cafe &amp; Cyber Zone</li> : null}
          <li>We&rsquo;ll review it and keep you updated here</li>
        </ol>
      </div>

      <ApplyButton serviceId={service.id} />
    </div>
  );
}
