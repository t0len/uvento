import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const RESERVATION_MINUTES = 10;

export function reservationDeadline(from = new Date()) {
  return new Date(from.getTime() + RESERVATION_MINUTES * 60 * 1000);
}

export function forgetExpiredReservations(eventId?: string) {
  return releaseExpiredReservations(prisma, eventId).catch((error: unknown) => {
    console.error("releaseExpiredReservations", error instanceof Error ? error.message : error);
    return 0;
  });
}

export async function releaseExpiredReservations(
  db: Prisma.TransactionClient | PrismaClient = prisma,
  eventId?: string,
) {
  const now = new Date();
  const expired = await db.registration.findMany({
    where: {
      status: "PENDING",
      reservedUntil: { lt: now },
      ...(eventId ? { eventId } : {}),
    },
    select: { id: true },
  });
  const ids = expired.map((item) => item.id);
  if (ids.length > 0) {
    await db.payment.updateMany({
      where: { registrationId: { in: ids }, status: "PENDING" },
      data: { status: "FAILED" },
    });
    await db.registration.updateMany({
      where: { id: { in: ids } },
      data: { status: "CANCELLED", reservedUntil: null },
    });
  }

  const expiredAddons = await db.payment.findMany({
    where: {
      status: "PENDING",
      reservedUntil: { lt: now },
      registration: {
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        ...(eventId ? { eventId } : {}),
      },
    },
    select: { id: true },
  });
  if (expiredAddons.length > 0) {
    await db.payment.updateMany({
      where: { id: { in: expiredAddons.map((item) => item.id) } },
      data: { status: "FAILED" },
    });
  }
  return ids.length + expiredAddons.length;
}
