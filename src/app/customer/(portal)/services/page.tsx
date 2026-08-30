import { getActiveServices } from "@/lib/customer/queries";
import { EmptyState } from "@/components/customer/empty-state";
import { ServiceQuickCard } from "@/components/customer/service-quick-card";

export default async function CustomerServicesPage() {
  const services = await getActiveServices();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-headline-md md:text-headline-lg text-foreground font-bold">Services</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Choose a service to get started.</p>
      </div>
      {services.length === 0 ? (
        <EmptyState message="No services are available right now. Please check back later." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceQuickCard key={service.id} service={service} variant="full" />
          ))}
        </div>
      )}
    </div>
  );
}
