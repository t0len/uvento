"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { canChangeRole, canManageUsers } from "@/lib/permissions";
import { cancelEventWithTickets } from "@/lib/cancel-event";
import { getI18n } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";

async function say(code: string) {
  const { t } = await getI18n();
  return errorText(t, code);
}

const ROLES: UserRole[] = ["STUDENT", "ORGANIZER", "ADMIN"];

export async function updateUserRole(userId: string, role: string) {
  const admin = await requireRole("ADMIN");

  if (!canChangeRole(admin) || !canManageUsers(admin)) {
    return { error: await say("noRights") };
  }

  if (!ROLES.includes(role as UserRole)) {
    return { error: await say("badRole") };
  }

  if (userId === admin.id && role !== "ADMIN") {
    return { error: await say("cannotDemoteSelf") };
  }

  if (role === "ORGANIZER") {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!membership) return { error: await say("addToOrgFirst") };
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
    return { error: await say("noRights") };
  }

  if (userId === admin.id) {
    return { error: await say("cannotBlockSelf") };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { blocked },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function createOrganizerAccount(formData: FormData) {
  await requireRole("ADMIN");
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("password"),
  });
  if (!parsed.success) return { error: await say(parsed.error.issues[0].message) };

  const organizationId = String(formData.get("organizationId") || "");
  const organization = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } })
    : null;
  if (!organization) return { error: await say("chooseOrganization") };

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) return { error: await say("emailTaken") };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ORGANIZER",
      organizationMemberships: { create: { organizationId: organization.id, role: "member" } },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  return { success: true as const };
}

export async function deleteUserAccount(userId: string) {
  const admin = await requireRole("ADMIN");
  if (!canManageUsers(admin)) return { error: await say("noRights") };
  if (userId === admin.id) return { error: await say("cannotDeleteSelf") };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { error: await say("userNotFound") };

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true as const };
}

export async function adminCancelEvent(eventId: string) {
  await requireRole("ADMIN");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { error: await say("eventNotFound") };
  }

  if (event.status === "CANCELLED") {
    return { error: await say("eventAlreadyCancelled") };
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
  if (name.length < 2) return { error: await say("orgNameShort") };

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
  if (!email) return { error: await say("emailRequired") };

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return { error: await say("userEmailNotFound") };

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) return { error: await say("orgNotFound") };

  try {
    await prisma.organizationMember.create({
      data: { userId: user.id, organizationId, role: "member" },
    });
  } catch {
    return { error: await say("alreadyMember") };
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
    return { error: await say("cannotRemoveMember") };
  }
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
  return { success: true as const };
}
