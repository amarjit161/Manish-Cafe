import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMyCustomer } from "@/lib/customer/queries";
import { BackLink } from "@/components/layout/back-link";
import { EditProfileForm } from "@/components/customer/edit-profile-form";

export default async function CustomerEditProfilePage() {
  const [profile, customer] = await Promise.all([getCurrentUserProfile(), getMyCustomer()]);

  const fullName = profile?.full_name ?? customer?.full_name ?? "";
  const email = profile?.email ?? customer?.email ?? null;
  const phone = profile?.phone ?? customer?.phone ?? "";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackLink href="/customer/account" label="Back to Account" />

      <div>
        <h1 className="text-headline-md md:text-headline-lg text-foreground font-bold">Edit profile</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Keep your details up to date.</p>
      </div>

      <EditProfileForm
        initialFullName={fullName}
        email={email}
        initialPhone={phone}
        initialAddress={customer?.address ?? ""}
        initialDateOfBirth={customer?.date_of_birth ?? ""}
      />
    </div>
  );
}
