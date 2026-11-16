import type { Prisma, PrismaClient } from "@prisma/client";

type TicketDb = Prisma.TransactionClient | PrismaClient;

export async function syncTicketPasses(
  db: TicketDb,
  registration: {
    id: string;
    ticketCode: string;
    quantity: number;
    status?: string;
    checkedInAt?: Date | null;
  },
) {
  const existing = await db.ticket.findMany({
    where: { registrationId: registration.id },
    orderBy: { position: "asc" },
  });
  const usedCodes = new Set(existing.map((item) => item.code));

  for (let position = 1; position <= registration.quantity; position += 1) {
    if (existing.some((item) => item.position === position)) continue;
    const reuseFirst = position === 1 && !usedCodes.has(registration.ticketCode);
    const created = await db.ticket.create({
      data: {
        registrationId: registration.id,
        position,
        ...(reuseFirst ? { code: registration.ticketCode } : {}),
      },
    });
    usedCodes.add(created.code);
    existing.push(created);
  }

  const extra = existing.filter((item) => item.position > registration.quantity && !item.checkedInAt);
  if (extra.length > 0) {
    await db.ticket.deleteMany({ where: { id: { in: extra.map((item) => item.id) } } });
  }

  return db.ticket.findMany({
    where: { registrationId: registration.id },
    orderBy: { position: "asc" },
  });
}

export function ticketQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1) return null;
  return quantity;
}
