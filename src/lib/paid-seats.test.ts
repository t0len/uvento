import assert from "node:assert/strict";
import { after, test } from "node:test";
import { PrismaClient, type Prisma } from "@prisma/client";
import { cancelActiveRegistrations } from "@/lib/blacklist";
import { hasCompletedPayment } from "@/lib/payments";
import { releaseExpiredReservations } from "@/lib/reservations";
import { occupiedSeatCount } from "@/lib/seats";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) throw new Error("DIRECT_URL is required to run the seat test");

const db = new PrismaClient({ datasources: { db: { url: directUrl } } });

class Rollback extends Error {
  constructor() {
    super("rollback");
    this.name = "Rollback";
  }
}

const createdTags: string[] = [];

after(async () => {
  for (const tag of createdTags) await removeFixture(tag);
  await db.$disconnect();
});

test("a completed payment cannot be cancelled by the buyer", () => {
  assert.equal(hasCompletedPayment([{ status: "COMPLETED" }]), true);
  assert.equal(hasCompletedPayment([{ status: "PENDING" }]), false);
  assert.equal(hasCompletedPayment([{ status: "FAILED" }, { status: "COMPLETED" }]), true);
});

test("paid seats stay occupied after the hold expires and after a block", async () => {
  const tag = `paid-seats-${Date.now().toString(36)}`;
  createdTags.push(tag);
  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 10 * 60_000);
  const rollback = new Rollback();

  try {
    await db.$transaction(
      async (tx) => {
        const buyer = await tx.user.create({
          data: { email: `${tag}-buyer@test.local`, passwordHash: "x", name: "Buyer", role: "STUDENT" },
        });
        const holder = await tx.user.create({
          data: { email: `${tag}-hold@test.local`, passwordHash: "x", name: "Hold", role: "STUDENT" },
        });
        const guest = await tx.user.create({
          data: { email: `${tag}-free@test.local`, passwordHash: "x", name: "Free", role: "STUDENT" },
        });
        const org = await tx.organization.create({ data: { name: tag, slug: tag } });
        const event = await tx.event.create({
          data: {
            title: tag,
            slug: tag,
            organizationId: org.id,
            capacity: 500,
            price: 2000,
            participationType: "PAID",
            status: "PUBLISHED",
            startDate: new Date("2027-01-30T07:00:00.000Z"),
            endDate: new Date("2027-01-30T12:00:00.000Z"),
          },
        });

        const paid = await tx.registration.create({
          data: {
            userId: buyer.id,
            eventId: event.id,
            status: "CONFIRMED",
            quantity: 2,
            reservedUntil: past,
            payments: {
              create: [
                {
                  userId: buyer.id,
                  amount: 4000,
                  quantity: 2,
                  status: "COMPLETED",
                  paidAt: new Date(),
                },
                {
                  userId: buyer.id,
                  amount: 2000,
                  quantity: 1,
                  status: "PENDING",
                  reservedUntil: future,
                },
              ],
            },
          },
        });
        const unpaid = await tx.registration.create({
          data: {
            userId: holder.id,
            eventId: event.id,
            status: "PENDING",
            quantity: 3,
            reservedUntil: past,
            payments: {
              create: {
                userId: holder.id,
                amount: 6000,
                quantity: 3,
                status: "PENDING",
                reservedUntil: past,
              },
            },
          },
        });
        const free = await tx.registration.create({
          data: {
            userId: guest.id,
            eventId: event.id,
            status: "CONFIRMED",
            quantity: 1,
          },
        });

        assert.equal(await occupiedSeatCount(tx, event.id), 7, "paid tickets, open extra, unpaid hold, and free seat all count");

        await releaseExpiredReservations(tx, event.id);
        assert.equal((await registrationOf(tx, unpaid.id)).status, "CANCELLED", "an unpaid expired hold is released");
        assert.equal((await registrationOf(tx, paid.id)).status, "CONFIRMED", "a paid registration survives an expired hold");
        assert.equal(await occupiedSeatCount(tx, event.id), 4, "only the unpaid hold leaves the count");

        await cancelActiveRegistrations(tx, org.id, guest.id);
        assert.equal((await registrationOf(tx, free.id)).status, "CANCELLED", "a registration without payment is cancelled by a block");
        assert.equal(await occupiedSeatCount(tx, event.id), 3, "the free seat is released");

        await cancelActiveRegistrations(tx, org.id, buyer.id);
        const kept = await tx.registration.findUniqueOrThrow({
          where: { id: paid.id },
          include: { payments: true },
        });
        assert.equal(kept.status, "CONFIRMED", "a block keeps the paid registration");
        assert.equal(kept.quantity, 2, "paid quantity stays");
        assert.equal(
          kept.payments.find((payment) => payment.amount === 4000)?.status,
          "COMPLETED",
          "the completed payment stays completed",
        );
        assert.equal(
          kept.payments.find((payment) => payment.amount === 2000)?.status,
          "FAILED",
          "only the unpaid extra is dropped",
        );
        assert.equal(await occupiedSeatCount(tx, event.id), 2, "the organizer count keeps the two paid seats");

        throw rollback;
      },
      { timeout: 30_000, maxWait: 15_000 },
    );
    assert.fail("transaction should roll back");
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  const leftover = await db.organization.findUnique({ where: { slug: tag } });
  assert.equal(leftover, null, "the check does not leave rows behind");
});

function registrationOf(tx: Prisma.TransactionClient, id: string) {
  return tx.registration.findUniqueOrThrow({ where: { id }, select: { status: true } });
}

async function removeFixture(tag: string) {
  const org = await db.organization.findUnique({ where: { slug: tag }, select: { id: true } });
  if (org) await db.organization.delete({ where: { id: org.id } });
  await db.user.deleteMany({
    where: {
      email: { in: [`${tag}-buyer@test.local`, `${tag}-hold@test.local`, `${tag}-free@test.local`] },
    },
  });
}
