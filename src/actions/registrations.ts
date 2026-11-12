"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { releaseExpiredReservations, reservationDeadline } from "@/lib/reservations";
import { createCheckoutUrl } from "@/lib/stripe-checkout";
import { syncTicketPasses, ticketQuantity } from "@/lib/tickets";
import { getI18n } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";
import { revalidatePath } from "next/cache";

async function say(code: string) {
  const { t } = await getI18n();
  return errorText(t, code);
}

export async function registerForEvent(eventId: string, requestedQuantity = 1) {
  const user = await requireAuth();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM events WHERE id = ${eventId} FOR UPDATE
      `;
      if (locked.length === 0) return { error: "eventNotFound" as const };

      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) return { error: "eventNotFound" as const };
      if (event.status !== "PUBLISHED") return { error: "registrationClosed" as const };
      if (event.participationType === "OPEN") {
        return { error: "openNoBooking" as const };
      }
      if (!event.endDate || event.endDate < new Date()) return { error: "eventEnded" as const };

      const quantity = ticketQuantity(requestedQuantity);
      if (quantity == null) return { error: "ticketCount" as const };

      await releaseExpiredReservations(tx, eventId);
      const takenRow = await tx.registration.aggregate({
        where: { eventId, status: { not: "CANCELLED" } },
        _sum: { quantity: true },
      });
      const taken = takenRow._sum.quantity ?? 0;
      const existing = await tx.registration.findUnique({
        where: { userId_eventId: { userId: user.id, eventId } },
      });

      if (existing && existing.status !== "CANCELLED") {
        return { error: "alreadyRegistered" as const };
      }
      if (event.capacity == null || taken >= event.capacity) return { error: "soldOut" as const };
      if (taken + quantity > event.capacity) return { error: "notEnoughSeats" as const };

      const paid = event.participationType === "PAID";
      const status = paid ? "PENDING" : "CONFIRMED";
      const reservedUntil = paid ? reservationDeadline() : null;
      const amount = event.price * quantity;
      const saved = existing
        ? await tx.registration.update({
            where: { id: existing.id },
            data: { status, reservedUntil, quantity },
          })
        : await tx.registration.create({
            data: { userId: user.id, eventId, status, reservedUntil, quantity },
          });
      const registrationId = saved.id;
      await syncTicketPasses(tx, {
        id: saved.id,
        ticketCode: saved.ticketCode,
        quantity: saved.quantity,
        status: saved.status,
        checkedInAt: saved.checkedInAt,
      });

      if (paid) {
        const payment = await tx.payment.findUnique({ where: { registrationId } });
        if (!payment) {
          await tx.payment.create({
            data: { registrationId, userId: user.id, amount, status: "PENDING" },
          });
        } else {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "PENDING", amount, paidAt: null, method: null },
          });
        }
      }

      return {
        success: true as const,
        status,
        registrationId,
        slug: event.slug,
        reservedUntil: reservedUntil?.toISOString() ?? null,
      };
    });

    if ("error" in result && result.error) return { error: await say(result.error) };

    revalidatePath(`/events/${result.slug}`);
    revalidatePath("/my/tickets");
    revalidatePath("/my/events");
    revalidatePath("/dashboard/registrations");
    return {
      success: true as const,
      status: result.status,
      registrationId: result.registrationId,
      reservedUntil: result.reservedUntil,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: await say("alreadyRegistered") };
    }
    throw error;
  }
}

export async function cancelRegistration(registrationId: string) {
  const user = await requireAuth();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) return { error: await say("registrationNotFound") };
  if (registration.userId !== user.id && user.role !== "ADMIN") {
    const membership =
      user.role === "ORGANIZER"
        ? await prisma.organizationMember.findFirst({
            where: { userId: user.id, organizationId: registration.event.organizationId },
            select: { id: true },
          })
        : null;
    if (!membership) return { error: await say("noCancelRights") };
  }
  if (registration.status === "CANCELLED") return { error: await say("alreadyCancelled") };
  if (registration.status === "CHECKED_IN") return { error: await say("cannotCancelCheckedIn") };

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/events/${registration.event.slug}`);
  revalidatePath("/my/tickets");
  revalidatePath("/my/events");
  revalidatePath("/dashboard/registrations");

  return { success: true };
}

export async function confirmPayment(registrationId: string) {
  const user = await requireAuth();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    return { error: await say("noRights") };
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true, event: true },
  });

  if (!registration) return { error: await say("registrationNotFound") };
  if (user.role === "ORGANIZER") {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organizationId: registration.event.organizationId },
      select: { id: true },
    });
    if (!membership) return { error: await say("otherOrg") };
  }
  if (registration.event.status !== "PUBLISHED") return { error: await say("registrationClosed") };
  if (!registration.event.endDate || registration.event.endDate < new Date()) return { error: await say("eventEnded") };
  if (registration.reservedUntil && registration.reservedUntil < new Date()) {
    await releaseExpiredReservations(prisma, registration.eventId);
    return { error: await say("reservationExpired") };
  }
  if (registration.status !== "PENDING") return { error: await say("notPending") };
  if (registration.payment?.status === "COMPLETED") return { error: await say("paymentRecorded") };

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registrationId },
      data: { status: "CONFIRMED", reservedUntil: null },
    }),
    ...(registration.payment
      ? [
          prisma.payment.update({
            where: { id: registration.payment.id },
            data: { status: "COMPLETED", paidAt: new Date(), method: "manual" },
          }),
        ]
      : []),
  ]);

  revalidatePath("/dashboard/registrations");
  revalidatePath(`/events/${registration.event.slug}`);

  return { success: true };
}

export async function startStripeCheckout(
  registrationId: string,
): Promise<{ error: string } | { url: string }> {
  const user = await requireAuth();
  if (!user.id) return { error: await say("noActiveHold") };
  try {
    const result = await createCheckoutUrl(registrationId, user.id);
    if ("error" in result && result.error) return { error: await say(result.error) };
    if ("url" in result && result.url) return { url: result.url };
    return { error: await say("stripeCheckoutFailed") };
  } catch (error) {
    console.error("stripe checkout", error instanceof Error ? error.message : error);
    return { error: await say("stripeCheckoutFailed") };
  }
}
