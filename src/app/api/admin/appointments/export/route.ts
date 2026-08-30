import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAppointments } from "@/lib/admin/queries";
import { formatSlotTime } from "@/lib/applications/appointments";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const MOBILE_REGISTERED_LABEL: Record<string, string> = {
  yes: "Registered",
  no: "Not registered",
  unknown: "Not sure",
  registered_other: "Someone else's",
};

/**
 * Admin-only, checked explicitly here (not just by the /admin middleware
 * gate) since this is a plain GET route a browser can navigate to
 * directly -- the same defense-in-depth pattern as every admin Server
 * Action. Reuses getAdminAppointments(), so the exported rows are always
 * exactly what the on-screen register shows for the same filters, never
 * a second, divergently-filtered query.
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

  const params = request.nextUrl.searchParams;
  const filters: Parameters<typeof getAdminAppointments>[0] = {};
  if (params.get("date")) filters.date = params.get("date")!;
  if (params.get("dateFrom")) filters.dateFrom = params.get("dateFrom")!;
  if (params.get("dateTo")) filters.dateTo = params.get("dateTo")!;
  if (params.get("status")) filters.status = params.get("status")!;
  if (params.get("service")) filters.serviceId = params.get("service")!;
  if (params.get("mobile")) filters.mobileRegistered = params.get("mobile") as "yes" | "no" | "unknown" | "registered_other";
  if (params.get("q")) filters.search = params.get("q")!;

  const appointments = await getAdminAppointments(filters);

  const columns = [
    "Customer Name",
    "Application Number",
    "Service",
    "Primary Mobile",
    "Alternative Mobile",
    "Aadhaar Mobile Registered",
    "Appointment Date",
    "Appointment Time",
    "Appointment Status",
    "Application Status",
  ];

  const rows = appointments.map((a) => {
    const answers = (a.applications?.answers ?? {}) as Record<string, unknown>;
    const mobileRegistered = typeof answers.mobile_registered === "string" ? answers.mobile_registered : "";
    return [
      a.customers?.full_name ?? "",
      a.applications?.application_number ?? "",
      a.applications?.services?.name ?? "",
      a.primary_mobile,
      a.alternative_mobile ?? "",
      mobileRegistered ? (MOBILE_REGISTERED_LABEL[mobileRegistered] ?? mobileRegistered) : "",
      a.appointment_date,
      a.appointment_slot_templates ? formatSlotTime(a.appointment_slot_templates.start_time) : "",
      a.status,
      a.applications?.status ?? "",
    ];
  });

  const csv = [columns, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\r\n");

  const filename = `appointments-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
