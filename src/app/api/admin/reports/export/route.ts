import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminReportsData, REPORT_RANGE_LABELS, type ReportRange } from "@/lib/admin/queries";
import { STATUS_LABELS } from "@/components/customer/status-badge";
import type { Database } from "@/lib/supabase/database.types";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const REPORT_RANGES: ReportRange[] = ["today", "7d", "30d", "90d", "all"];

/**
 * Admin-only, checked explicitly here (not just by the /admin middleware
 * gate) since this is a plain GET route a browser can navigate to
 * directly -- the same defense-in-depth pattern as the appointments
 * export. Reuses getAdminReportsData()'s rawApplications -- the exact same
 * rows the on-screen report was computed from for the same range, never a
 * second, divergently-filtered query.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rangeParam = request.nextUrl.searchParams.get("range");
  const range: ReportRange = REPORT_RANGES.includes(rangeParam as ReportRange) ? (rangeParam as ReportRange) : "30d";

  const { rawApplications } = await getAdminReportsData(range);

  const columns = [
    "Application Number",
    "Customer Name",
    "Customer Email",
    "Service",
    "Status",
    "Created",
    "Submitted",
    "Completed",
    "Price (INR)",
  ];

  const rows = rawApplications.map((a) => [
    a.application_number ?? "",
    a.customers?.full_name ?? "",
    a.customers?.email ?? "",
    a.services?.name ?? "",
    STATUS_LABELS[a.status as Database["public"]["Enums"]["application_status"]] ?? a.status,
    a.created_at,
    a.submitted_at ?? "",
    a.completed_at ?? "",
    String(a.total_price_snapshot ?? a.customer_price_snapshot ?? ""),
  ]);

  const csv = [columns, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\r\n");

  const rangeSlug = REPORT_RANGE_LABELS[range].toLowerCase().replace(/\s+/g, "-");
  const filename = `applications-report-${rangeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
