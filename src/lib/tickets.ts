import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizePhone } from "@/lib/person";
import { profileSchema } from "@/lib/validations/auth";

type TicketDb = Prisma.TransactionClient | PrismaClient;

export type TicketHolder = { name: string; lastName: string; phone: string };

export function parseHolders(count: number, raw: unknown): { holders: TicketHolder[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length !== count) return { error: "holdersRequired" };
  const holders: TicketHolder[] = [];
  for (const item of raw) {
    const parsed = profileSchema.safeParse(item);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "holdersRequired" };
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return { error: "phoneInvalid" };
    holders.push({ name: parsed.data.name, lastName: parsed.data.lastName, phone });
  }
  return { holders };
}

export function holdersForPass(value: unknown, count: number): TicketHolder[] | null {
  const parsed = parseHolders(count, value);
  return "error" in parsed ? null : parsed.holders;
}

function holderFields(holder: TicketHolder) {
  return {
    holderName: holder.name,
    holderLastName: holder.lastName,
    holderPhone: holder.phone,
  };
}

export async function syncTicketPasses(
  db: TicketDb,
  registration: {
    id: string;
    ticketCode: string;
    quantity: number;
    status?: string;
    checkedInAt?: Date | null;
  },
  assignment?: { holders: TicketHolder[]; startPosition?: number },
) {
  const existing = await db.ticket.findMany({
    where: { registrationId: registration.id },
    orderBy: { position: "asc" },
  });
  const usedCodes = new Set(existing.map((item) => item.code));
  const have = new Set(existing.map((item) => item.position));
  const assigned = new Map<number, TicketHolder>();
  const start = assignment?.startPosition ?? 1;
  assignment?.holders.forEach((holder, index) => assigned.set(start + index, holder));
  const missing: {
    registrationId: string;
    position: number;
    code?: string;
    holderName?: string;
    holderLastName?: string;
    holderPhone?: string;
  }[] = [];

  for (let position = 1; position <= registration.quantity; position += 1) {
    if (have.has(position)) continue;
    const reuseFirst = position === 1 && !usedCodes.has(registration.ticketCode);
    const holder = assigned.get(position);
    missing.push({
      registrationId: registration.id,
      position,
      ...(reuseFirst ? { code: registration.ticketCode } : {}),
      ...(holder ? holderFields(holder) : {}),
    });
  }

  if (missing.length > 0) {
    await db.ticket.createMany({ data: missing });
  }

  for (const ticket of existing) {
    const holder = assigned.get(ticket.position);
    if (!holder) continue;
    await db.ticket.update({ where: { id: ticket.id }, data: holderFields(holder) });
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
