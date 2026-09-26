"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function checkIn(ticketCode: string) {
  const user = await requireAuth();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    return { error: "Нет прав для чек-ина" };
  }

  const registration = await prisma.registration.findUnique({
    where: { ticketCode },
    include: {
      user: { select: { name: true, email: true } },
      event: { select: { title: true, slug: true, organizationId: true } },
    },
  });

  if (!registration) return { error: "Билет не найден" };
  if (registration.status === "CANCELLED") return { error: "Регистрация отменена" };
  if (registration.status === "CHECKED_IN") {
    return {
      error: `Уже отмечен: ${registration.user.name} (${registration.checkedInAt?.toLocaleString()})`,
    };
  }
  if (registration.status === "PENDING") return { error: "Оплата не подтверждена" };

  await prisma.registration.update({
    where: { ticketCode },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });

  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/registrations");

  return {
    success: true,
    attendee: {
      name: registration.user.name,
      email: registration.user.email,
      event: registration.event.title,
    },
  };
}
