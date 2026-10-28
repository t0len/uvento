"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { revalidatePath } from "next/cache";

export async function checkIn(ticketCode: string, eventId: string) {
  const user = await requireAuth();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    return { error: "Нет прав для чек-ина" };
  }
  if (!eventId) return { error: "Выберите событие" };

  const now = new Date();
  const updated = await prisma.registration.updateMany({
    where: {
      ticketCode,
      eventId,
      status: "CONFIRMED",
      event: {
        status: "PUBLISHED",
        endDate: { gte: now },
        organization: { members: { some: { userId: user.id } } },
      },
    },
    data: { status: "CHECKED_IN", checkedInAt: now },
  });

  const registration = await prisma.registration.findUnique({
    where: { ticketCode },
    include: {
      user: { select: { name: true, email: true } },
      event: { select: { id: true, title: true, slug: true, organizationId: true, status: true, endDate: true } },
    },
  });

  if (updated.count === 1 && registration) {
    revalidatePath("/dashboard/check-in");
    revalidatePath("/dashboard/registrations");
    return {
      success: true as const,
      attendee: {
        name: registration.user.name,
        email: registration.user.email,
        event: registration.event.title,
      },
    };
  }

  if (!registration) return { error: "Билет не найден" };
  if (registration.eventId !== eventId) return { error: "Это билет другого события" };

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, organizationId: registration.event.organizationId },
    select: { id: true },
  });
  if (!membership && user.role !== "ADMIN") return { error: "Это событие другой организации" };
  if (registration.event.status === "CANCELLED") return { error: "Событие отменено" };
  if (registration.event.endDate < now) return { error: "Событие уже закончилось" };
  if (registration.event.status !== "PUBLISHED") return { error: "Регистрация на это мероприятие закрыта" };
  if (registration.status === "CANCELLED") return { error: "Регистрация отменена" };
  if (registration.status === "CHECKED_IN") {
    const when = registration.checkedInAt
      ? `${formatEventDate(registration.checkedInAt, "ru-RU")} ${formatEventTime(registration.checkedInAt, "ru-RU")}`
      : "";
    return { error: `Уже отмечен: ${registration.user.name}${when ? ` (${when})` : ""}` };
  }
  if (registration.status === "PENDING") return { error: "Оплата не подтверждена" };
  return { error: "Билет не найден" };
}
