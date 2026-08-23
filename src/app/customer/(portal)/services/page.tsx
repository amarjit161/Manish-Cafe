import Link from "next/link";
import { getActiveServices } from "@/lib/customer/queries";
import { EmptyState } from "@/components/customer/empty-state";

export default async function CustomerServicesPage() {
  const services = await getActiveServices();

  return (
    <div className="space-y-4">
      <h1 className="text-headline-md text-foreground">Services</h1>
      {services.length === 0 ? (
        <EmptyState message="No services are available right now. Please check back later." />
      ) : (
        <ul className="space-y-3">
          {services.map((service) => (
            <li key={service.id}>
              <Link
                href={`/customer/services/${service.id}`}
                className="block rounded-xl bg-surface-container-lowest border border-outline-variant p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-lg text-foreground font-semibold">{service.name}</p>
                    {service.description ? (
                      <p className="text-body-md text-on-surface-variant mt-1">{service.description}</p>
                    ) : null}
                    {service.category ? (
                      <p className="text-label-sm text-on-surface-variant mt-1">{service.category}</p>
                    ) : null}
                  </div>
                  <span className="text-label-lg text-foreground font-semibold whitespace-nowrap">
                    ₹{service.customer_price}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
