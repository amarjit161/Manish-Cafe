import Link from "next/link";
import { getActiveServices } from "@/lib/customer/queries";
import { EmptyState } from "@/components/customer/empty-state";

export default async function CustomerServicesPage() {
  const services = await getActiveServices();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-headline-md text-foreground">Services</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Choose a service to get started.</p>
      </div>
      {services.length === 0 ? (
        <EmptyState message="No services are available right now. Please check back later." />
      ) : (
        <ul className="space-y-3">
          {services.map((service) => (
            <li
              key={service.id}
              className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 space-y-3"
            >
              <div>
                <p className="text-body-lg text-foreground font-semibold">{service.name}</p>
                {service.description ? (
                  <p className="text-body-md text-on-surface-variant mt-0.5">{service.description}</p>
                ) : null}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-headline-md text-foreground font-semibold">₹{service.customer_price}</span>
                <Link
                  href={`/customer/services/${service.id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary text-on-primary px-5 text-label-lg font-medium"
                >
                  Apply
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
