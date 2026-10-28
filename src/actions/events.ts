"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { canCreateEvent, canEditEvent, canPublishEvent } from "@/lib/permissions";
import { publishGaps, readEventForm } from "@/lib/participation";
import { releaseExpiredReservations } from "@/lib/reservations";
import { addHoursLocal, combineLocalDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { deleteEventImage, saveEventImage } from "@/lib/uploads";
import { cancelEventWithTickets } from "@/lib/cancel-event";
import { membershipOrganizations } from "@/lib/organizations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function imageError(code: string) {
  const { t } = await getI18n();
  if (code === "imageSize") return t.dashboard.imageSize;
  if (code === "imageUpload") return t.dashboard.imageUpload;
  return t.dashboard.imageType;
}

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
  const endDay = String(formData.get("endDate") || "") || date;
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");

  if (date && startTime) {
    const startDate = combineLocalDateTime(date, startTime);
    const endDate = endTime
      ? combineLocalDateTime(endDay, endTime)
      : endDay && endDay !== date
        ? combineLocalDateTime(endDay, startTime)
        : addHoursLocal(date, startTime, 2);
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
  const parsed = readEventForm(formData, dates.startDate, dates.endDate);
  if ("error" in parsed) return { error: parsed.error };
  const draft = parsed.data;
  const publishing = formData.get("intent") === "publish";
  if (publishing) {
    const gaps = publishGaps(draft);
    if (gaps.length > 0) return { error: gaps.join(". ") };
  }

  const { title, description, shortDescription, location, venue, startDate, endDate, capacity, price, participationType, categoryIds } = draft;

  const memberships = await membershipOrganizations(user.id);
  if (memberships.length === 0) {
    return { error: "Вы не состоите ни в одной организации" };
  }
  const requestedOrg = String(formData.get("organizationId") || "");
  const organizationId =
    memberships.length === 1 ? memberships[0].id : requestedOrg;
  if (!memberships.some((org) => org.id === organizationId)) {
    return { error: "Выберите организацию" };
  }

  const cover = formData.get("cover");
  let coverImageUrl: string | undefined;
  if (cover instanceof File && cover.size > 0) {
    const saved = await saveEventImage(cover);
    if (saved.error) return { error: await imageError(saved.error) };
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
      startDate,
      endDate,
      capacity,
      price,
      participationType,
      coverImageUrl,
      status: publishing ? "PUBLISHED" : "DRAFT",
      organizationId,
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

  const seenAt = String(formData.get("updatedAt") || "");
  if (seenAt && event.updatedAt.toISOString() !== seenAt) {
    return { error: "Событие уже изменилось. Откройте страницу ещё раз." };
  }

  const dates = eventDates(formData);
  const parsed = readEventForm(formData, dates.startDate, dates.endDate);
  if ("error" in parsed) return { error: parsed.error };
  const draft = parsed.data;
  if (event.status === "PUBLISHED") {
    const gaps = publishGaps(draft);
    if (gaps.length > 0) return { error: gaps.join(". ") };
  }

  if (draft.capacity != null) {
    await releaseExpiredReservations();
    const active = await prisma.registration.count({
      where: { eventId, status: { not: "CANCELLED" } },
    });
    if (draft.capacity < active) {
      return { error: "Вместимость меньше числа текущих участников" };
    }
  }

  const data = {
    title: draft.title,
    description: draft.description,
    shortDescription: draft.shortDescription ?? null,
    location: draft.location,
    venue: draft.venue ?? null,
    startDate: draft.startDate,
    endDate: draft.endDate,
    capacity: draft.capacity,
    price: draft.price,
    participationType: draft.participationType,
  };
  const categoryIds = draft.categoryIds;

  const cover = formData.get("cover");
  let coverImageUrl: string | undefined;
  if (cover instanceof File && cover.size > 0) {
    const saved = await saveEventImage(cover);
    if (saved.error) return { error: await imageError(saved.error) };
    coverImageUrl = saved.url;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: coverImageUrl ? { ...data, coverImageUrl } : data,
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
  if (coverImageUrl) {
    await deleteEventImage(event.coverImageUrl);
  }
  redirect(`/dashboard/events/${eventId}`);
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

  const gaps = publishGaps(event);
  if (gaps.length > 0) return { error: gaps.join(". ") };

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

  await cancelEventWithTickets(eventId);

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/my/tickets");
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

  const active = await prisma.registration.count({
    where: { eventId, status: { not: "CANCELLED" } },
  });
  if (active > 0) {
    return { error: "Нельзя удалить событие, пока на него есть участники" };
  }

  await prisma.event.delete({ where: { id: eventId } });
  await deleteEventImage(event.coverImageUrl);

  revalidatePath("/dashboard/events");
  revalidatePath("/events");
  redirect("/dashboard/events");
}
