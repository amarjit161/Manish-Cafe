import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { availableStartHours, dateAndHourToDate, isValidDateStr } from "@/lib/time";

// GET /api/bookings?stationId=..&date=YYYY-MM-DD -> public availability for one station/day
// GET /api/bookings (admin session required) -> recent bookings across all stations
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");
  const date = searchParams.get("date");

  if (stationId && date) {
    if (!isValidDateStr(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const dayStart = dateAndHourToDate(date, 0);
    const dayEnd = dateAndHourToDate(date, 24);
    const bookings = await prisma.booking.findMany({
      where: {
        stationId,
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
        startAt: { gte: dayStart, lt: dayEnd },
      },
      select: { startAt: true, endAt: true, status: true },
    });
    return NextResponse.json({ bookings });
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 20, 1), 100);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { customerName: { contains: search, mode: "insensitive" as const } },
            { customerPhone: { contains: search } },
          ],
        }
      : {}),
  };

  const bookings = await prisma.booking.findMany({
    where,
    include: { station: true },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    skip,
  });
  const hasMore = bookings.length > take;
  return NextResponse.json({ items: bookings.slice(0, take), hasMore });
}

const createBookingSchema = z.object({
  stationId: z.string().min(1),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
  date: z.string().refine(isValidDateStr, "Invalid date"),
  startHour: z.number().int(),
  durationHours: z.number().int().min(1).max(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { stationId, customerName, customerPhone, date, startHour, durationHours } = parsed.data;

  if (!availableStartHours().includes(startHour)) {
    return NextResponse.json({ error: "Selected start time is outside operating hours" }, { status: 400 });
  }

  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station || !station.isActive) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const startAt = dateAndHourToDate(date, startHour);
  const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);

  if (startAt.getTime() < Date.now() - 5 * 60 * 1000) {
    return NextResponse.json({ error: "Cannot book a time in the past" }, { status: 400 });
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      stationId,
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "This time slot is already booked. Please pick another slot." },
      { status: 409 },
    );
  }

  const booking = await prisma.booking.create({
    data: {
      stationId,
      customerName,
      customerPhone,
      startAt,
      endAt,
      durationHours,
      totalAmount: station.hourlyRate * durationHours,
      status: "PENDING",
    },
    include: { station: true },
  });

  return NextResponse.json(booking, { status: 201 });
}
