"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { releaseExpiredReservations, reservationDeadline } from "@/lib/reservations";
import { occupiedSeatCount } from "@/lib/seats";
import { createCheckoutUrl } from "@/lib/stripe-checkout";
import { syncTicketPasses, ticketQuantity } from "@/lib/tickets";
import { getI18n } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";
import { revalidatePath } from "next/cache";

async function say(code: string) {
  const { t } = await getI18n();
  return errorText(t, code);
}

function revalidateRegistration(slug: string) {
  revalidatePath(`/events/${slug}`);
  revalidatePath("/my/tickets");
  revalidatePath("/my/events");
  revalidatePath("/dashboard/registrations");
  revalidatePath("/dashboard");
}

async function organizerCanManage(
  userId: string,
  role: string,
  organizationId: string,
  ownerId: string,
) {
  if (role === "ADMIN") return true;
  if (role !== "ORGANIZER") return ownerId === userId;
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  return Boolean(membership);
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
      const taken = await occupiedSeatCount(tx, eventId);
      const existing = await tx.registration.findUnique({
        where: { userId_eventId: { userId: user.id, eventId } },
        include: { payments: { orderBy: { createdAt: "desc" } } },
      });

      if (existing && existing.status !== "CANCELLED") {
        return { error: "alreadyRegistered" as const };
      }

      const paidBefore = existing?.payments.some((payment) => payment.status === "COMPLETED") ?? false;
      if (existing && paidBefore && event.participationType === "PAID") {
        if (event.capacity == null || taken >= event.capacity) return { error: "soldOut" as const };
        if (taken + existing.quantity > event.capacity) return { error: "notEnoughSeats" as const };
        const saved = await tx.registration.update({
          where: { id: existing.id },
          data: { status: "CONFIRMED", reservedUntil: null },
        });
        await syncTicketPasses(tx, saved);
        return {
          success: true as const,
          status: "CONFIRMED" as const,
          registrationId: saved.id,
          slug: event.slug,
          reservedUntil: null,
          paymentId: null,
          quantity: saved.quantity,
        };
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
      await syncTicketPasses(tx, saved);

      let paymentId: string | null = null;
      if (paid) {
        const payment =
          existing?.payments.find((item) => item.status !== "COMPLETED") ?? existing?.payments[0] ?? null;
        if (!payment) {
          const created = await tx.payment.create({
            data: {
              registrationId: saved.id,
              userId: user.id,
              amount,
              quantity,
              status: "PENDING",
              reservedUntil,
            },
          });
          paymentId = created.id;
        } else {
          const updated = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "PENDING",
              amount,
              quantity,
              paidAt: null,
              method: null,
              externalId: null,
              reservedUntil,
            },
          });
          paymentId = updated.id;
        }
      }

      return {
        success: true as const,
        status,
        registrationId: saved.id,
        slug: event.slug,
        reservedUntil: reservedUntil?.toISOString() ?? null,
        paymentId,
        quantity: saved.quantity,
      };
    });

    if ("error" in result && result.error) return { error: await say(result.error) };

    revalidateRegistration(result.slug);
    return {
      success: true as const,
      status: result.status,
      registrationId: result.registrationId,
      reservedUntil: result.reservedUntil,
      paymentId: result.paymentId,
      quantity: result.quantity,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: await say("alreadyRegistered") };
    }
    throw error;
  }
}

export async function addTickets(eventId: string, requestedExtra = 1) {
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
      if (event.participationType === "OPEN") return { error: "openNoBooking" as const };
      if (!event.endDate || event.endDate < new Date()) return { error: "eventEnded" as const };

      const extra = ticketQuantity(requestedExtra);
      if (extra == null) return { error: "ticketCount" as const };

      await releaseExpiredReservations(tx, eventId);
      const existing = await tx.registration.findUnique({
        where: { userId_eventId: { userId: user.id, eventId } },
        include: { payments: { orderBy: { createdAt: "desc" } } },
      });
      if (!existing || existing.status === "CANCELLED") return { error: "registrationNotFound" as const };
      if (existing.status === "PENDING") return { error: "finishPaymentFirst" as const };
      if (existing.status !== "CONFIRMED" && existing.status !== "CHECKED_IN") {
        return { error: "registrationClosed" as const };
      }

      const openAddon = existing.payments.find(
        (payment) => payment.status === "PENDING" && payment.reservedUntil && payment.reservedUntil > new Date(),
      );
      if (openAddon) {
        return {
          success: true as const,
          status: "PENDING" as const,
          registrationId: existing.id,
          paymentId: openAddon.id,
          slug: event.slug,
          reservedUntil: openAddon.reservedUntil?.toISOString() ?? null,
        };
      }

      const taken = await occupiedSeatCount(tx, eventId);
      if (event.capacity == null || taken >= event.capacity) return { error: "soldOut" as const };
      if (taken + extra > event.capacity) return { error: "notEnoughSeats" as const };

      if (event.participationType !== "PAID") {
        const saved = await tx.registration.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + extra },
        });
        await syncTicketPasses(tx, saved);
        return {
          success: true as const,
          status: existing.status,
          registrationId: saved.id,
          paymentId: null,
          slug: event.slug,
          reservedUntil: null,
          quantity: saved.quantity,
        };
      }

      const reservedUntil = reservationDeadline();
      const payment = await tx.payment.create({
        data: {
          registrationId: existing.id,
          userId: user.id,
          amount: event.price * extra,
          quantity: extra,
          status: "PENDING",
          reservedUntil,
        },
      });
      return {
        success: true as const,
        status: "PENDING" as const,
        registrationId: existing.id,
        paymentId: payment.id,
        slug: event.slug,
        reservedUntil: reservedUntil.toISOString(),
        quantity: existing.quantity,
      };
    });

    if ("error" in result && result.error) return { error: await say(result.error) };
    revalidateRegistration(result.slug);
    return {
      success: true as const,
      status: result.status,
      registrationId: result.registrationId,
      paymentId: result.paymentId,
      reservedUntil: result.reservedUntil,
      quantity: "quantity" in result ? result.quantity : undefined,
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
  const allowed = await organizerCanManage(
    user.id,
    user.role,
    registration.event.organizationId,
    registration.userId,
  );
  if (!allowed) return { error: await say("noCancelRights") };
  if (registration.status === "CANCELLED") return { error: await say("alreadyCancelled") };
  if (registration.status === "CHECKED_IN") return { error: await say("cannotCancelCheckedIn") };

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "CANCELLED", reservedUntil: null },
  });
  await prisma.payment.updateMany({
    where: { registrationId, status: "PENDING" },
    data: { status: "FAILED" },
  });

  revalidateRegistration(registration.event.slug);
  return { success: true };
}

export async function restoreRegistration(registrationId: string) {
  const user = await requireAuth();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id: registrationId },
        include: { event: true, payments: { orderBy: { createdAt: "desc" } } },
      });
      if (!registration) return { error: "registrationNotFound" as const };
      if (user.role !== "ADMIN") {
        if (user.role !== "ORGANIZER") return { error: "noCancelRights" as const };
        const membership = await tx.organizationMember.findFirst({
          where: { userId: user.id, organizationId: registration.event.organizationId },
          select: { id: true },
        });
        if (!membership) return { error: "noCancelRights" as const };
      }
      if (registration.status !== "CANCELLED") return { error: "notCancelled" as const };
      if (registration.event.status !== "PUBLISHED") return { error: "registrationClosed" as const };
      if (!registration.event.endDate || registration.event.endDate < new Date()) {
        return { error: "eventEnded" as const };
      }

      await tx.$queryRaw`
        SELECT id FROM events WHERE id = ${registration.eventId} FOR UPDATE
      `;
      await releaseExpiredReservations(tx, registration.eventId);
      const taken = await occupiedSeatCount(tx, registration.eventId);
      if (registration.event.capacity == null || taken + registration.quantity > registration.event.capacity) {
        return { error: "notEnoughSeats" as const };
      }

      const paid = registration.event.participationType === "PAID";
      const completed = registration.payments.some((payment) => payment.status === "COMPLETED");
      if (!paid || completed) {
        const saved = await tx.registration.update({
          where: { id: registration.id },
          data: { status: "CONFIRMED", reservedUntil: null },
        });
        await syncTicketPasses(tx, saved);
        return { success: true as const, slug: registration.event.slug };
      }

      const reservedUntil = reservationDeadline();
      const amount = registration.event.price * registration.quantity;
      await tx.registration.update({
        where: { id: registration.id },
        data: { status: "PENDING", reservedUntil },
      });
      const reusable = registration.payments.find((payment) => payment.status !== "COMPLETED");
      if (reusable) {
        await tx.payment.update({
          where: { id: reusable.id },
          data: {
            status: "PENDING",
            amount,
            quantity: registration.quantity,
            reservedUntil,
            paidAt: null,
            method: null,
            externalId: null,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            registrationId: registration.id,
            userId: registration.userId,
            amount,
            quantity: registration.quantity,
            status: "PENDING",
            reservedUntil,
          },
        });
      }
      return { success: true as const, slug: registration.event.slug };
    });

    if ("error" in result && result.error) return { error: await say(result.error) };
    revalidateRegistration(result.slug);
    return { success: true as const };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: await say("alreadyRegistered") };
    }
    throw error;
  }
}

export async function confirmPayment(registrationId: string) {
  const user = await requireAuth();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    return { error: await say("noRights") };
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payments: { orderBy: { createdAt: "desc" } }, event: true },
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

  const pendingPayment = registration.payments.find((payment) => payment.status === "PENDING");
  if (!pendingPayment) {
    if (registration.payments.some((payment) => payment.status === "COMPLETED")) {
      return { error: await say("paymentRecorded") };
    }
    return { error: await say("notPending") };
  }

  const hold = pendingPayment.reservedUntil ?? registration.reservedUntil;
  if (hold && hold < new Date()) {
    await releaseExpiredReservations(prisma, registration.eventId);
    return { error: await say("reservationExpired") };
  }

  const addon = registration.status === "CONFIRMED" || registration.status === "CHECKED_IN";
  if (!addon && registration.status !== "PENDING") return { error: await say("notPending") };

  const applied = await prisma.$transaction(async (tx) => {
    const marked = await tx.payment.updateMany({
      where: { id: pendingPayment.id, status: "PENDING" },
      data: { status: "COMPLETED", paidAt: new Date(), method: "manual", reservedUntil: null },
    });
    if (marked.count !== 1) return false;
    if (addon) {
      const saved = await tx.registration.update({
        where: { id: registrationId },
        data: { quantity: { increment: pendingPayment.quantity } },
      });
      await syncTicketPasses(tx, saved);
      return true;
    }
    const saved = await tx.registration.update({
      where: { id: registrationId },
      data: { status: "CONFIRMED", reservedUntil: null },
    });
    await syncTicketPasses(tx, saved);
    return true;
  });
  if (!applied) return { error: await say("paymentRecorded") };

  revalidateRegistration(registration.event.slug);
  return { success: true };
}

export async function startStripeCheckout(
  registrationId: string,
  paymentId?: string,
): Promise<{ error: string } | { url: string }> {
  const user = await requireAuth();
  if (!user.id) return { error: await say("noActiveHold") };
  try {
    const result = await createCheckoutUrl(registrationId, user.id, paymentId);
    if ("error" in result && result.error) return { error: await say(result.error) };
    if ("url" in result && result.url) return { url: result.url };
    return { error: await say("stripeCheckoutFailed") };
  } catch (error) {
    console.error("stripe checkout", error instanceof Error ? error.message : error);
    return { error: await say("stripeCheckoutFailed") };
  }
}
