"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { releaseExpiredReservations, reservationDeadline } from "@/lib/reservations";
import { revalidatePath } from "next/cache";

export async function registerForEvent(eventId: string) {
  const user = await requireAuth();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM events WHERE id = ${eventId} FOR UPDATE
      `;
      if (locked.length === 0) return { error: "Мероприятие не найдено" as const };

      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) return { error: "Мероприятие не найдено" as const };
      if (event.status !== "PUBLISHED") return { error: "Регистрация на это мероприятие закрыта" as const };
      if (event.participationType === "OPEN") {
        return { error: "Это открытое событие: запись и оплата не нужны" as const };
      }
      if (!event.endDate || event.endDate < new Date()) return { error: "Событие уже закончилось" as const };

      await releaseExpiredReservations(tx, eventId);
      const taken = await tx.registration.count({
        where: { eventId, status: { not: "CANCELLED" } },
      });
      const existing = await tx.registration.findUnique({
        where: { userId_eventId: { userId: user.id, eventId } },
      });

      if (existing && existing.status !== "CANCELLED") {
        return { error: "Вы уже зарегистрированы на это мероприятие" as const };
      }
      if (event.capacity == null || taken >= event.capacity) return { error: "Все места заняты" as const };

      const paid = event.participationType === "PAID";
      const status = paid ? "PENDING" : "CONFIRMED";
      const reservedUntil = paid ? reservationDeadline() : null;
      let registrationId: string;

      if (existing) {
        await tx.registration.update({
          where: { id: existing.id },
          data: { status, reservedUntil },
        });
        registrationId = existing.id;
      } else {
        const registration = await tx.registration.create({
          data: { userId: user.id, eventId, status, reservedUntil },
        });
        registrationId = registration.id;
      }

      if (paid) {
        const payment = await tx.payment.findUnique({ where: { registrationId } });
        if (!payment) {
          await tx.payment.create({
            data: { registrationId, userId: user.id, amount: event.price, status: "PENDING" },
          });
        } else {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "PENDING", amount: event.price, paidAt: null, method: null },
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

    if ("error" in result) return result;

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
      return { error: "Вы уже зарегистрированы на это мероприятие" };
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

  if (!registration) return { error: "Регистрация не найдена" };
  if (registration.userId !== user.id && user.role !== "ADMIN") {
    const membership =
      user.role === "ORGANIZER"
        ? await prisma.organizationMember.findFirst({
            where: { userId: user.id, organizationId: registration.event.organizationId },
            select: { id: true },
          })
        : null;
    if (!membership) return { error: "Нет прав для отмены регистрации" };
  }
  if (registration.status === "CANCELLED") return { error: "Регистрация уже отменена" };
  if (registration.status === "CHECKED_IN") return { error: "Нельзя отменить после чек-ина" };

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
    return { error: "Нет прав" };
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true, event: true },
  });

  if (!registration) return { error: "Регистрация не найдена" };
  if (user.role === "ORGANIZER") {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organizationId: registration.event.organizationId },
      select: { id: true },
    });
    if (!membership) return { error: "Это событие другой организации" };
  }
  if (registration.event.status !== "PUBLISHED") return { error: "Регистрация на это мероприятие закрыта" };
  if (!registration.event.endDate || registration.event.endDate < new Date()) return { error: "Событие уже закончилось" };
  if (registration.reservedUntil && registration.reservedUntil < new Date()) {
    await releaseExpiredReservations(prisma, registration.eventId);
    return { error: "Время брони истекло. Место снова свободно." };
  }
  if (registration.status !== "PENDING") return { error: "Регистрация не в статусе ожидания" };
  if (registration.payment?.status === "COMPLETED") return { error: "Оплата уже записана" };

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

function mockCardError(formData: FormData) {
  const card = String(formData.get("card") || "").replace(/\s/g, "");
  const expiry = String(formData.get("expiry") || "").trim();
  const cvv = String(formData.get("cvv") || "").trim();
  const holder = String(formData.get("holder") || "").trim();
  if (!/^\d{16}$/.test(card)) return "Номер карты — 16 цифр";
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return "Срок в формате ММ/ГГ";
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return "Некорректный месяц";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const currentYear = Number(parts.find((part) => part.type === "year")?.value);
  const currentMonth = Number(parts.find((part) => part.type === "month")?.value);
  if (year * 12 + month < currentYear * 12 + currentMonth) return "Срок карты истёк";
  if (!/^\d{3}$/.test(cvv)) return "CVV — 3 цифры";
  if (holder.length < 2) return "Укажите имя на карте";
  return null;
}

export async function completeMockPayment(registrationId: string, formData: FormData) {
  const user = await requireAuth();
  const invalid = mockCardError(formData);
  if (invalid) return { error: invalid };

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true, event: true },
  });
  if (!registration || registration.userId !== user.id) {
    return { error: "Нет активной брони на это событие" };
  }
  if (registration.payment?.status === "COMPLETED" || registration.status === "CONFIRMED" || registration.status === "CHECKED_IN") {
    return { error: "Оплата уже записана" };
  }
  if (registration.status !== "PENDING" || !registration.payment) {
    return { error: "Нет активной брони на это событие" };
  }
  if (!registration.reservedUntil || registration.reservedUntil < new Date()) {
    await releaseExpiredReservations(prisma, registration.eventId);
    return { error: "Время брони истекло. Место снова свободно." };
  }

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registration.id },
      data: { status: "CONFIRMED", reservedUntil: null },
    }),
    prisma.payment.update({
      where: { id: registration.payment.id },
      data: { status: "COMPLETED", paidAt: new Date(), method: "mock", amount: registration.event.price },
    }),
  ]);

  revalidatePath(`/events/${registration.event.slug}`);
  revalidatePath("/my/tickets");
  revalidatePath("/my/events");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/registrations");
  return { success: true as const };
}
