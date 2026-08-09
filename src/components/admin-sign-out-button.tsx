"use client";

import { useRouter } from "next/navigation";

export function AdminSignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className={className}>
      <span className="material-symbols-outlined">logout</span>
      <span>Sign Out</span>
    </button>
  );
}
