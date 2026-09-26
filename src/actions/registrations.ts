"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function registerForEvent(eventId: string) {
  const user = await requireAuth();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } } },
  });

  if (!event) return { error: "Мероприятие не найдено" };
  if (event.status !== "PUBLISHED") return { error: "Регистрация на это мероприятие закрыта" };
  if (event._count.registrations >= event.capacity) return { error: "Все места заняты" };

  const existing = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
  });

  if (existing && existing.status !== "CANCELLED") {
    return { error: "Вы уже зарегистрированы на это мероприятие" };
  }

  if (existing && existing.status === "CANCELLED") {
    await prisma.registration.update({
      where: { id: existing.id },
      data: { status: event.price > 0 ? "PENDING" : "CONFIRMED" },
    });
  } else {
    const registration = await prisma.registration.create({
      data: {
        userId: user.id,
        eventId,
        status: event.price > 0 ? "PENDING" : "CONFIRMED",
      },
    });

    if (event.price > 0) {
      await prisma.payment.create({
        data: {
          registrationId: registration.id,
          userId: user.id,
          amount: event.price,
          status: "PENDING",
        },
      });
    }
  }

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/my/tickets");
  revalidatePath("/my/events");
  revalidatePath("/dashboard/registrations");

  return { success: true };
}

export async function cancelRegistration(registrationId: string) {
  const user = await requireAuth();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) return { error: "Регистрация не найдена" };
  if (registration.userId !== user.id && user.role !== "ADMIN") {
    return { error: "Нет прав для отмены регистрации" };
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
