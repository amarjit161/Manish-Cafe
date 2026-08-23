"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PORTAL_HOME, PORTAL_LOGIN, type AppRole } from "@/lib/auth/roles";

export type AuthActionState = { error?: string; success?: string } | undefined;

async function signInForRole(role: AppRole, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();

  // A valid login for the wrong portal (e.g. a customer account used on the
  // retailer login page) is rejected with the same generic message, and the
  // session is torn down immediately -- never silently redirected to their
  // real portal from here, and never a different error message that would
  // leak which portal an email belongs to.
  if (!profile || profile.role !== role || profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "Invalid email or password." };
  }

  redirect(PORTAL_HOME[role]);
}

export async function signInCustomer(_prevState: AuthActionState, formData: FormData) {
  return signInForRole("customer", formData);
}

export async function signInRetailer(_prevState: AuthActionState, formData: FormData) {
  return signInForRole("retailer", formData);
}

export async function signInAdmin(_prevState: AuthActionState, formData: FormData) {
  return signInForRole("admin", formData);
}

export async function signUpCustomer(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!email || !password || !fullName) {
    return { error: "Name, email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone: phone || undefined } },
  });

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already registered")
        ? "An account with this email already exists."
        : "Could not create your account. Please try again.",
    };
  }

  if (data.session) {
    redirect(PORTAL_HOME.customer);
  }

  return { success: "Account created. Check your email to confirm your address before logging in." };
}

export async function signOutAndRedirect(redirectTo: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(redirectTo);
}

export async function requestPasswordReset(
  role: AppRole,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? `https://${headersList.get("host")}`;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}${PORTAL_LOGIN[role].replace("/login", "/reset-password")}`,
  });

  // Same response whether or not the account exists, so this can't be used
  // to enumerate registered emails.
  return { success: "If an account exists for that email, a reset link has been sent." };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Could not update your password. The reset link may have expired." };
  }

  return { success: "Password updated. You can now log in." };
}
