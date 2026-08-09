import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { dateAndHourToDate } from "@/lib/time";

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayStart = dateAndHourToDate(todayStr(), 0);
  const dayEnd = dateAndHourToDate(todayStr(), 24);

  const [totalBookings, todaysBookings, pendingSeva, activeBookings, totalStations, todaysRevenue] =
    await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
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
    ]);

  return NextResponse.json({
    totalBookings,
    todaysBookings,
    pendingSeva,
    activeBookings,
    totalStations,
    todaysRevenue: todaysRevenue._sum.totalAmount ?? 0,
  });
}
