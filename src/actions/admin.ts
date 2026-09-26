"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canChangeRole, canManageUsers } from "@/lib/permissions";

const ROLES: UserRole[] = ["STUDENT", "ORGANIZER", "ADMIN"];

export async function updateUserRole(userId: string, role: string) {
  const admin = await requireRole("ADMIN");

  if (!canChangeRole(admin) || !canManageUsers(admin)) {
    return { error: "Недостаточно прав" };
  }

  if (!ROLES.includes(role as UserRole)) {
    return { error: "Некорректная роль" };
  }

  if (userId === admin.id && role !== "ADMIN") {
    return { error: "Нельзя снять роль ADMIN с самого себя" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as UserRole },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminCancelEvent(eventId: string) {
  await requireRole("ADMIN");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { error: "Событие не найдено" };
  }

  if (event.status === "CANCELLED") {
    return { error: "Событие уже отменено" };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  return { success: true };
}
