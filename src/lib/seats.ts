import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SeatDb = Prisma.TransactionClient | PrismaClient;

export async function occupiedSeatCount(db: SeatDb, eventId: string, now = new Date()) {
  const takenRow = await db.registration.aggregate({
    where: { eventId, status: { not: "CANCELLED" } },
    _sum: { quantity: true },
  });
  const addonRow = await db.payment.aggregate({
    where: {
      status: "PENDING",
      reservedUntil: { gt: now },
      registration: { eventId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    },
    _sum: { quantity: true },
  });
  return (takenRow._sum.quantity ?? 0) + (addonRow._sum.quantity ?? 0);
}

export async function occupiedSeats(eventId: string) {
  return occupiedSeatCount(prisma, eventId);
}

export async function occupiedSeatsByEvent(eventIds: string[]) {
  const seats = new Map<string, number>();
  if (eventIds.length === 0) return seats;
  const now = new Date();
  const rows = await prisma.registration.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds }, status: { not: "CANCELLED" } },
    _sum: { quantity: true },
  });
  for (const row of rows) seats.set(row.eventId, row._sum.quantity ?? 0);
  const addons = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      reservedUntil: { gt: now },
      registration: { eventId: { in: eventIds }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    },
    select: { quantity: true, registration: { select: { eventId: true } } },
  });
  for (const addon of addons) {
    const eventId = addon.registration.eventId;
    seats.set(eventId, (seats.get(eventId) ?? 0) + addon.quantity);
  }
  return seats;
}
