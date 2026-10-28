"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canChangeRole, canManageUsers } from "@/lib/permissions";
import { cancelEventWithTickets } from "@/lib/cancel-event";

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

  if (role === "ORGANIZER") {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!membership) return { error: "Сначала добавьте пользователя в организацию" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as UserRole },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  const admin = await requireRole("ADMIN");

  if (!canManageUsers(admin)) {
    return { error: "Недостаточно прав" };
  }

  if (userId === admin.id) {
    return { error: "Нельзя заблокировать самого себя" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { blocked },
  });

  revalidatePath("/admin/users");
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

  await cancelEventWithTickets(eventId);

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/my/tickets");
  return { success: true };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createOrganization(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") || "").trim();
  if (name.length < 2) return { error: "Укажите название организации" };

  let slug = slugify(name);
  if (!slug) slug = `org-${Date.now().toString(36)}`;
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  await prisma.organization.create({ data: { name, slug } });
  revalidatePath("/admin/organizations");
  revalidatePath("/organizations");
  return { success: true as const };
}

export async function addOrganizationMember(organizationId: string, formData: FormData) {
  await requireRole("ADMIN");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Укажите почту" };

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return { error: "Пользователь с такой почтой не найден" };

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) return { error: "Организация не найдена" };

  try {
    await prisma.organizationMember.create({
      data: { userId: user.id, organizationId, role: "member" },
    });
  } catch {
    return { error: "Пользователь уже в этой организации" };
  }

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
  return { success: true as const };
}

export async function removeOrganizationMember(membershipId: string) {
  await requireRole("ADMIN");
  try {
    await prisma.organizationMember.delete({ where: { id: membershipId } });
  } catch {
    return { error: "Не удалось убрать участника" };
  }
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
  return { success: true as const };
}
