import Link from "next/link";

/**
 * Presentational-only icon per known service slug -- purely a visual aid,
 * never a source of truth for anything (name/price/appointment requirement
 * always come from the real `services` row). Falls back to a generic icon
 * for any service this map doesn't yet know about, so a newly-added
 * service never renders broken.
 */
const SERVICE_ICONS: Record<string, string> = {
  "aadhaar-card-update": "fingerprint",
  "pan-card-application": "credit_card",
  "income-certificate": "receipt_long",
  "passport-application-assistance": "flight_takeoff",
  "voter-id-registration-correction": "how_to_vote",
};
const DEFAULT_SERVICE_ICON = "description";

type Service = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  customer_price: number;
  requires_appointment: boolean;
};

export function ServiceQuickCard({ service }: { service: Service }) {
  const icon = (service.slug && SERVICE_ICONS[service.slug]) || DEFAULT_SERVICE_ICON;

  return (
    <Link
      href={`/customer/services/${service.id}`}
      className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 hover:border-primary/40 transition-colors"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-container/15 text-primary"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-body-md font-semibold text-foreground">{service.name}</p>
        {service.description ? (
          <p className="text-label-sm text-on-surface-variant line-clamp-2">{service.description}</p>
        ) : null}
        {service.requires_appointment ? (
          <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              event
            </span>
            Appointment required
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-outline-variant">
        <span className="text-body-md font-semibold text-foreground">₹{service.customer_price}</span>
        <span className="text-label-sm font-medium text-primary">Apply →</span>
      </div>
    </Link>
  );
}
