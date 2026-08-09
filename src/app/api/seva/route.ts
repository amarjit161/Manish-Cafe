import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 20, 1), 100);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { applicantName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const requests = await prisma.sevaRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    skip,
  });
  const hasMore = requests.length > take;
  return NextResponse.json({ items: requests.slice(0, take), hasMore });
}

const createSevaSchema = z.object({
  applicantName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
  serviceType: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSevaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const created = await prisma.sevaRequest.create({ data: parsed.data });
  return NextResponse.json(created, { status: 201 });
}
