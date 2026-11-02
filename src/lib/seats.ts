import { prisma } from "@/lib/prisma";

export async function occupiedSeats(eventId: string) {
  const row = await prisma.registration.aggregate({
    where: { eventId, status: { not: "CANCELLED" } },
    _sum: { quantity: true },
  });
  return row._sum.quantity ?? 0;
}

export async function occupiedSeatsByEvent(eventIds: string[]) {
  const seats = new Map<string, number>();
  if (eventIds.length === 0) return seats;
  const rows = await prisma.registration.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds }, status: { not: "CANCELLED" } },
    _sum: { quantity: true },
  });
  for (const row of rows) seats.set(row.eventId, row._sum.quantity ?? 0);
  return seats;
}
