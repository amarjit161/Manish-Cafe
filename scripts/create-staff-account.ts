import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const [, , email, password, role, fullName] = process.argv;

  if (!email || !password || (role !== "retailer" && role !== "admin")) {
    console.error("Usage: npm run create-staff -- <email> <password> <retailer|admin> [full name]");
    process.exit(1);
  }

  const supabase = createAdminClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (createError || !created.user) {
    console.error("Failed to create auth user:", createError?.message);
    process.exit(1);
  }

  // handle_new_user() has already created a 'customer' profile at this point.
  // Role elevation is always a separate, explicit server-side step -- never
  // inferred from anything supplied at signup.
  const { error: updateError } = await supabase.from("profiles").update({ role }).eq("id", created.user.id);

  if (updateError) {
    console.error("User created but role update failed:", updateError.message);
    process.exit(1);
  }

  console.log(`Created ${role} account for ${email} (id: ${created.user.id})`);
}

main();
