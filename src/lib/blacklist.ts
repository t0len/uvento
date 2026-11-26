import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { personName } from "@/lib/person";
import type { BlockHistoryEntry } from "@/lib/block-reason";

type Db = Prisma.TransactionClient | typeof prisma;

export async function isUserBlocked(db: Db, organizationId: string, userId: string) {
  const row = await db.organizationBlacklist.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { active: true },
  });
  return row?.active === true;
}

export async function cancelActiveRegistrations(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
) {
  const registrations = await tx.registration.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "CONFIRMED"] },
      event: { organizationId },
    },
    select: {
      id: true,
      status: true,
      eventId: true,
      event: { select: { slug: true } },
      payments: { select: { status: true } },
    },
  });
  if (registrations.length === 0) return registrations;

  const paid = registrations.filter((registration) =>
    registration.payments.some((payment) => payment.status === "COMPLETED"),
  );
  const unpaid = registrations.filter((registration) => !paid.includes(registration));

  if (paid.length > 0) {
    const paidIds = paid.map((registration) => registration.id);
    await tx.payment.updateMany({
      where: { registrationId: { in: paidIds }, status: "PENDING" },
      data: { status: "FAILED", reservedUntil: null },
    });
    const pendingPaid = paid
      .filter((registration) => registration.status === "PENDING")
      .map((registration) => registration.id);
    if (pendingPaid.length > 0) {
      await tx.registration.updateMany({
        where: { id: { in: pendingPaid }, status: "PENDING" },
        data: { status: "CONFIRMED", reservedUntil: null },
      });
    }
  }

  if (unpaid.length > 0) {
    const ids = unpaid.map((registration) => registration.id);
    await tx.registration.updateMany({
      where: { id: { in: ids }, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "CANCELLED", reservedUntil: null },
    });
    await tx.payment.updateMany({
      where: { registrationId: { in: ids }, status: "PENDING" },
      data: { status: "FAILED", reservedUntil: null },
    });
  }

  return registrations;
}

export function historyEntry(entry: {
  id: string;
  action: "BLOCK" | "UNBLOCK";
  reason: string;
  documentName: string | null;
  documentPath: string | null;
  createdAt: Date;
  actor: { name: string; lastName: string } | null;
}): BlockHistoryEntry {
  return {
    id: entry.id,
    action: entry.action,
    reason: entry.reason,
    documentName: entry.documentPath ? entry.documentName || "document" : null,
    createdAt: entry.createdAt.toISOString(),
    actorName: entry.actor ? personName(entry.actor) : "",
  };
}
