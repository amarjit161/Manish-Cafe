import { SubmitApplicationButton } from "@/components/customer/submit-application-button";
import { computePriceBreakdown } from "@/lib/applications/pricing";
import { formatRequestedUpdates } from "@/lib/applications/aadhaar-fields";

type RequiredDocRow = {
  typeId: string;
  name: string;
  currentlyRequired: boolean;
  uploaded: boolean;
};

/**
 * "Review your application" -- the price shown here is always computed
 * live from the service's base price plus whichever configured extra
 * charges apply to the current answers (computePriceBreakdown), the exact
 * same calculation the server repeats independently inside
 * change_application_status() when the customer actually submits. Nothing
 * is hardcoded here; a new service or a new extra-charge condition needs
 * no changes to this component.
 */
export function ApplicationReview({
  applicationId,
  serviceName,
  basePrice,
  answers,
  extraCharges,
  showRequestedUpdates,
  requiredDocs,
}: {
  applicationId: string;
  serviceName: string;
  basePrice: number;
  answers: Record<string, unknown>;
  extraCharges: { condition_key: string; label: string; amount: number }[];
  showRequestedUpdates: boolean;
  requiredDocs: RequiredDocRow[];
}) {
  const breakdown = computePriceBreakdown({ basePrice, answers, extraCharges });
  const requestedUpdates = showRequestedUpdates ? formatRequestedUpdates(answers) : [];
  const contactMobile = typeof answers.contact_mobile === "string" ? answers.contact_mobile : "";
  const activeDocs = requiredDocs.filter((d) => d.currentlyRequired);
  const allUploaded = activeDocs.length > 0 && activeDocs.every((d) => d.uploaded);

  return (
    <div className="space-y-4 rounded-2xl bg-surface-container-low p-4">
      <p className="text-label-lg text-foreground">Review your application</p>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-body-md">
          <span className="text-foreground">{serviceName}</span>
        </div>
        <div className="flex items-center justify-between text-body-md text-on-surface-variant">
          <span>Base service</span>
          <span>₹{breakdown.base}</span>
        </div>
        {breakdown.extras.map((extra) => (
          <div key={extra.label} className="flex items-center justify-between text-body-md text-on-surface-variant">
            <span>{extra.label}</span>
            <span>₹{extra.amount}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-outline-variant pt-2 mt-1">
          <span className="text-body-lg font-semibold text-foreground">Total</span>
          <span className="text-headline-md font-semibold text-foreground">₹{breakdown.total}</span>
        </div>
      </div>

      {requestedUpdates.length > 0 ? (
        <div className="space-y-1">
          <p className="text-label-sm font-medium text-on-surface-variant">What you&rsquo;re updating</p>
          <ul className="space-y-0.5">
            {requestedUpdates.map((update) => (
              <li key={update} className="text-body-md text-foreground">
                ✓ {update}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {contactMobile ? (
        <div className="space-y-1">
          <p className="text-label-sm font-medium text-on-surface-variant">How we&rsquo;ll reach you</p>
          <p className="text-body-md text-foreground">{contactMobile}</p>
        </div>
      ) : null}

      {activeDocs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-label-sm font-medium text-on-surface-variant">Documents</p>
          <ul className="space-y-0.5">
            {activeDocs.map((doc) => (
              <li key={doc.typeId} className="text-body-md text-foreground">
                {doc.uploaded ? "✓" : "○"} {doc.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {allUploaded || activeDocs.length === 0 ? (
        <SubmitApplicationButton applicationId={applicationId} />
      ) : (
        <p className="text-label-sm text-on-surface-variant">
          Upload the documents above to submit your application.
        </p>
      )}
    </div>
  );
}
