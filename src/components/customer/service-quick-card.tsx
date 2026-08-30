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

export function serviceIcon(slug: string | null): string {
  return (slug && SERVICE_ICONS[slug]) || DEFAULT_SERVICE_ICON;
}

type Service = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  customer_price: number;
  requires_appointment: boolean;
};

/**
 * Appointment-requirement indicator -- always shows one of the two real
 * states (never just silently omitted), so a customer never has to infer
 * "no appointment" from the absence of a badge. Icon + distinct text in
 * both states, not color alone.
 */
function AppointmentChip({ required }: { required: boolean }) {
  if (required) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-container px-2.5 py-1 text-label-sm font-medium text-on-warning-container">
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          event
        </span>
        Appointment required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-container px-2.5 py-1 text-label-sm font-medium text-on-success-container">
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        check_circle
      </span>
      No appointment needed
    </span>
  );
}

/**
 * The one service card used both on the customer dashboard preview
 * ("compact") and the full services catalogue ("full") -- so the two
 * never drift into showing different names/prices/icons for the same
 * service. "compact" keeps the dashboard's tight tile treatment; "full"
 * is the richer catalogue-page card (bigger CTA, "onwards" price framing,
 * an explicit appointment/no-appointment chip either way).
 */
export function ServiceQuickCard({ service, variant = "compact" }: { service: Service; variant?: "compact" | "full" }) {
  const icon = serviceIcon(service.slug);

  if (variant === "full") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 hover:border-primary/40 transition-colors">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container/15 text-primary"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-body-lg font-semibold text-foreground">{service.name}</p>
          {service.description ? <p className="text-body-md text-on-surface-variant">{service.description}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant">
          <span className="text-body-lg font-semibold text-foreground">₹{service.customer_price} onwards</span>
          <AppointmentChip required={service.requires_appointment} />
        </div>

        <Link
          href={`/customer/services/${service.id}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:brightness-110 active:scale-[0.98] transition-all"
        >
          Apply
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>
    );
  }

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
