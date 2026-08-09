import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateAndHourToDate } from "@/lib/time";
import { StatusSelect } from "@/components/admin/status-select";
import { GamingQueue } from "@/components/admin/gaming-queue";
import { SevaQueue } from "@/components/admin/seva-queue";
import { LiveRefresher } from "@/components/admin/live-refresher";
import { CallLink } from "@/components/admin/call-link";

export const dynamic = "force-dynamic";

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDateTime(d: Date) {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function AdminDashboardPage() {
  // eslint-disable-next-line react-hooks/purity -- server-rendered snapshot for a force-dynamic live dashboard
  const renderedAt = Date.now();
  const dayStart = dateAndHourToDate(todayStr(), 0);
  const dayEnd = dateAndHourToDate(todayStr(), 24);

  const [
    totalBookings,
    pendingSeva,
    activeBookings,
    totalStations,
    todaysRevenueAgg,
    queueBookings,
    sevaToday,
    recentEnquiries,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.sevaRequest.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.booking.count({ where: { status: "ACTIVE" } }),
    prisma.station.count({ where: { isActive: true } }),
    prisma.booking.aggregate({
      where: {
        createdAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "ACTIVE", "COMPLETED"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        OR: [
          { status: "ACTIVE" },
          {
            status: { in: ["PENDING", "CONFIRMED"] },
            startAt: { gte: dayStart, lt: dayEnd },
          },
        ],
      },
      include: { station: true },
      orderBy: { startAt: "asc" },
      take: 50,
    }),
    prisma.sevaRequest.findMany({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.courseEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const todaysRevenue = todaysRevenueAgg._sum.totalAmount ?? 0;

  const stats = [
    {
      label: "Bookings",
      value: totalBookings,
      icon: "confirmation_number",
      hint: `${activeBookings} active now`,
      bg: "bg-surface-container",
      fg: "text-primary-container",
    },
    {
      label: "Pending Seva",
      value: pendingSeva,
      icon: "pending_actions",
      hint: pendingSeva > 0 ? "Action required" : "All caught up",
      bg: "bg-orange-50",
      fg: "text-secondary",
    },
    {
      label: "Revenue Today",
      value: `₹${todaysRevenue.toLocaleString("en-IN")}`,
      icon: "currency_rupee",
      hint: "Confirmed + completed bookings",
      bg: "bg-green-50",
      fg: "text-tertiary-container",
    },
    {
      label: "Active Stations",
      value: `${activeBookings}/${totalStations}`,
      icon: "desktop_windows",
      hint: "PCs & consoles in use",
      bg: "bg-blue-50",
      fg: "text-blue-600",
    },
  ];

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-outline-variant/30">
        <div>
          <h1 className="text-headline-lg text-primary">Admin Dashboard</h1>
          <p className="text-on-surface-variant text-sm">
            Welcome back. Here is what is happening today.
          </p>
        </div>
        <LiveRefresher intervalMs={8000} />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4"
          >
            <div className={`w-14 h-14 rounded-xl ${s.bg} flex items-center justify-center ${s.fg}`}>
              <span className="material-symbols-outlined text-3xl">{s.icon}</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                {s.label}
              </p>
              <h3 className="text-3xl font-bold text-primary">{s.value}</h3>
              <p className="text-tertiary-container text-xs font-bold">{s.hint}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Live queues */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
        <GamingQueue bookings={queueBookings} now={renderedAt} />
        <SevaQueue requests={sevaToday} now={renderedAt} />
      </section>

      {/* Course Enquiries */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">school</span>
            Skill Course Enquiries
          </h3>
          <Link href="/admin/history?tab=courses" className="text-xs font-bold text-secondary hover:underline">
            View Full History
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentEnquiries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant text-sm">
                    No enquiries yet.
                  </td>
                </tr>
              )}
              {recentEnquiries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-primary">{e.studentName}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{e.courseName}</td>
                  <td className="px-6 py-4 text-sm">
                    <CallLink phone={e.phone} />
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {formatDateTime(e.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StatusSelect
                      id={e.id}
                      endpoint="/api/courses"
                      currentStatus={e.status}
                      options={["NEW", "FOLLOW_UP", "ENROLLED", "CLOSED"]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
