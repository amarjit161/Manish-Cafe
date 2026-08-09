"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_NAME } from "@/lib/site-data";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-6">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant/40">
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-primary mb-2">{SITE_NAME}</div>
          <p className="text-on-surface-variant font-medium">Administrator Portal Access</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Email Address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
              placeholder="admin@manishcafe.in"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm font-medium bg-error-container text-on-error-container">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-white font-bold rounded-lg hover:brightness-110 transition-all shadow-lg disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign Into Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
