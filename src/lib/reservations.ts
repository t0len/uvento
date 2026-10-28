import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const RESERVATION_MINUTES = 10;

export function reservationDeadline(from = new Date()) {
  return new Date(from.getTime() + RESERVATION_MINUTES * 60 * 1000);
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
  if (expired.length === 0) return 0;
  const ids = expired.map((item) => item.id);
  await db.payment.updateMany({
    where: { registrationId: { in: ids }, status: "PENDING" },
    data: { status: "FAILED" },
  });
  await db.registration.updateMany({
    where: { id: { in: ids } },
    data: { status: "CANCELLED", reservedUntil: null },
  });
  return ids.length;
}
