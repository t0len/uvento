"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";
import { revalidatePath } from "next/cache";

async function say(code: string) {
  const { t } = await getI18n();
  return errorText(t, code);
}

export async function checkIn(ticketCode: string, eventId: string) {
  const user = await requireAuth();
  const { locale, t } = await getI18n();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    return { error: errorText(t, "noCheckInRights") };
  }
  if (!eventId) return { error: errorText(t, "chooseEvent") };

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
        quantity: registration.quantity,
      },
    };
  }

  if (!registration) return { error: await say("ticketNotFound") };
  if (registration.eventId !== eventId) return { error: await say("wrongEventTicket") };

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, organizationId: registration.event.organizationId },
    select: { id: true },
  });
  if (!membership && user.role !== "ADMIN") return { error: await say("otherOrg") };
  if (registration.event.status === "CANCELLED") return { error: await say("eventCancelled") };
  if (registration.event.endDate && registration.event.endDate < now) return { error: await say("eventEnded") };
  if (registration.event.status !== "PUBLISHED") return { error: await say("registrationClosed") };
  if (registration.status === "CANCELLED") return { error: await say("registrationCancelled") };
  if (registration.status === "CHECKED_IN") {
    const when = registration.checkedInAt
      ? ` (${formatEventDate(registration.checkedInAt, localeDate[locale])} ${formatEventTime(registration.checkedInAt, localeDate[locale])})`
      : "";
    return { error: tReplace(t.errors.alreadyCheckedIn, { name: registration.user.name, when }) };
  }
  if (registration.status === "PENDING") return { error: await say("paymentNotConfirmed") };
  return { error: await say("ticketNotFound") };
}
