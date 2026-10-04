"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { canCreateEvent, canEditEvent, canPublishEvent } from "@/lib/permissions";
import { createEventSchema, updateEventSchema } from "@/lib/validations/events";
import { addHoursLocal, combineLocalDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { saveEventImage } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function eventDates(formData: FormData) {
  const date = String(formData.get("date") || "");
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");

  if (date && startTime) {
    const startDate = combineLocalDateTime(date, startTime);
    const endDate = endTime ? combineLocalDateTime(date, endTime) : addHoursLocal(date, startTime, 2);
    return { startDate, endDate };
  }

  return {
    startDate: String(formData.get("startDate") || ""),
    endDate: String(formData.get("endDate") || ""),
  };
}

export async function createEvent(formData: FormData) {
  const user = await requireAuth();
  if (!canCreateEvent(user)) {
    return { error: "Нет прав для создания мероприятия" };
  }

  const dates = eventDates(formData);
  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    shortDescription: (formData.get("shortDescription") as string) || undefined,
    location: formData.get("location") as string,
    venue: (formData.get("venue") as string) || undefined,
    startDate: dates.startDate,
    endDate: dates.endDate,
    capacity: formData.get("capacity") as string,
    price: (formData.get("price") as string) || "0",
    categoryIds: formData.getAll("categoryIds") as string[],
  };

  const validated = createEventSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const { title, description, shortDescription, location, venue, startDate, endDate, capacity, price, categoryIds } = validated.data;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  if (!membership) {
    return { error: "Вы не состоите ни в одной организации" };
  }

  const cover = formData.get("cover");
  let coverImageUrl: string | undefined;
  if (cover instanceof File && cover.size > 0) {
    const saved = await saveEventImage(cover);
    if (saved.error) {
      const { t } = await getI18n();
      return { error: saved.error === "imageSize" ? t.dashboard.imageSize : t.dashboard.imageType };
    }
    coverImageUrl = saved.url;
  }

  let slug = slugify(title);
  if (!slug) slug = `event-${Date.now().toString(36)}`;
  const existing = await prisma.event.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const event = await prisma.event.create({
    data: {
      title,
      slug,
      description,
      shortDescription,
      location,
      venue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      capacity,
      price,
      coverImageUrl,
      status: formData.get("intent") === "publish" ? "PUBLISHED" : "DRAFT",
      organizationId: membership.organizationId,
      categories: categoryIds?.length
        ? { create: categoryIds.map((id) => ({ categoryId: id })) }
        : undefined,
    },
  });

  revalidatePath("/dashboard/events");
  revalidatePath("/events");
  redirect(`/dashboard/events/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const user = await requireAuth();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organization: { include: { members: { select: { userId: true } } } } },
  });

  if (!event) return { error: "Мероприятие не найдено" };

  if (!canEditEvent(user, { organizationId: event.organizationId, members: event.organization.members })) {
    return { error: "Нет прав для редактирования" };
  }

  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key !== "categoryIds" && value) raw[key] = value;
  }
  raw.categoryIds = formData.getAll("categoryIds");

  const validated = updateEventSchema.safeParse(raw);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const data: Record<string, unknown> = {};
  const { categoryIds, ...fields } = validated.data;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      if (key === "startDate" || key === "endDate") {
        data[key] = new Date(value as string);
      } else {
        data[key] = value;
      }
    }
  }

  await prisma.event.update({
    where: { id: eventId },
    data,
  });

  if (categoryIds) {
    await prisma.eventCategory.deleteMany({ where: { eventId } });
    if (categoryIds.length > 0) {
      await prisma.eventCategory.createMany({
        data: categoryIds.map((categoryId) => ({ eventId, categoryId })),
      });
    }
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
}

export async function publishEvent(eventId: string) {
  const user = await requireAuth();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organization: { include: { members: { select: { userId: true } } } } },
  });

  if (!event) return { error: "Мероприятие не найдено" };

  if (!canPublishEvent(user, { organizationId: event.organizationId, members: event.organization.members })) {
    return { error: "Нет прав для публикации" };
  }

  if (event.status !== "DRAFT") {
    return { error: "Можно опубликовать только черновик" };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED" },
  });

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/events");
}

export async function cancelEvent(eventId: string) {
  const user = await requireAuth();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organization: { include: { members: { select: { userId: true } } } } },
  });

  if (!event) return { error: "Мероприятие не найдено" };

  if (!canEditEvent(user, { organizationId: event.organizationId, members: event.organization.members })) {
    return { error: "Нет прав" };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/events");
}

export async function deleteEvent(eventId: string) {
  const user = await requireAuth();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organization: { include: { members: { select: { userId: true } } } } },
  });

  if (!event) return { error: "Мероприятие не найдено" };

  if (!canEditEvent(user, { organizationId: event.organizationId, members: event.organization.members })) {
    return { error: "Нет прав для удаления" };
  }

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/dashboard/events");
  revalidatePath("/events");
  redirect("/dashboard/events");
}
