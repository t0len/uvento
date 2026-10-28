"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
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
      if (event.endDate < new Date()) return { error: "Событие уже закончилось" as const };

      const taken = await tx.registration.count({
        where: { eventId, status: { not: "CANCELLED" } },
      });
      const existing = await tx.registration.findUnique({
        where: { userId_eventId: { userId: user.id, eventId } },
      });

      if (existing && existing.status !== "CANCELLED") {
        return { error: "Вы уже зарегистрированы на это мероприятие" as const };
      }
      if (taken >= event.capacity) return { error: "Все места заняты" as const };

      const status = event.price > 0 ? "PENDING" : "CONFIRMED";
      let registrationId: string;

      if (existing) {
        await tx.registration.update({
          where: { id: existing.id },
          data: { status },
        });
        registrationId = existing.id;
      } else {
        const registration = await tx.registration.create({
          data: { userId: user.id, eventId, status },
        });
        registrationId = registration.id;
      }

      if (event.price > 0) {
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

      return { success: true as const, status, registrationId, slug: event.slug };
    });

    if ("error" in result) return result;

    revalidatePath(`/events/${result.slug}`);
    revalidatePath("/my/tickets");
    revalidatePath("/my/events");
    revalidatePath("/dashboard/registrations");
    return { success: true as const, status: result.status, registrationId: result.registrationId };
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
  if (registration.event.endDate < new Date()) return { error: "Событие уже закончилось" };
  if (registration.status !== "PENDING") return { error: "Регистрация не в статусе ожидания" };

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registrationId },
      data: { status: "CONFIRMED" },
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
