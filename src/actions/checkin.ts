"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";
import { syncTicketPasses } from "@/lib/tickets";
import { revalidatePath } from "next/cache";

async function say(code: string) {
  const { t } = await getI18n();
  return errorText(t, code);
}

const registrationInclude = {
  user: { select: { name: true, email: true } },
  event: { select: { id: true, title: true, slug: true, organizationId: true, status: true, endDate: true } },
} as const;

async function findPass(code: string) {
  const direct = await prisma.ticket.findUnique({
    where: { code },
    include: { registration: { include: registrationInclude } },
  });
  if (direct) return direct;

  const registration = await prisma.registration.findUnique({ where: { ticketCode: code } });
  if (!registration) return null;
  await syncTicketPasses(prisma, registration);
  return prisma.ticket.findUnique({
    where: { code },
    include: { registration: { include: registrationInclude } },
  });
}

export async function checkIn(ticketCode: string, eventId: string) {
  const user = await requireAuth();
  const { locale, t } = await getI18n();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    return { error: errorText(t, "noCheckInRights") };
  }
  if (!eventId) return { error: errorText(t, "chooseEvent") };

  const pass = await findPass(ticketCode.trim());
  if (!pass) return { error: await say("ticketNotFound") };

  const registration = pass.registration;
  if (registration.eventId !== eventId) return { error: await say("wrongEventTicket") };

  const now = new Date();
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, organizationId: registration.event.organizationId },
    select: { id: true },
  });
  if (!membership && user.role !== "ADMIN") return { error: await say("otherOrg") };
  if (registration.event.status === "CANCELLED") return { error: await say("eventCancelled") };
  if (registration.event.endDate && registration.event.endDate < now) return { error: await say("eventEnded") };
  if (registration.event.status !== "PUBLISHED") return { error: await say("registrationClosed") };
  if (registration.status === "CANCELLED") return { error: await say("registrationCancelled") };
  if (registration.status === "PENDING") return { error: await say("paymentNotConfirmed") };
  if (registration.status !== "CONFIRMED" && registration.status !== "CHECKED_IN") {
    return { error: await say("ticketNotFound") };
  }

  const whenOf = (at: Date | null) =>
    at ? ` (${formatEventDate(at, localeDate[locale])} ${formatEventTime(at, localeDate[locale])})` : "";

  if (pass.checkedInAt || registration.status === "CHECKED_IN") {
    return {
      error: tReplace(t.errors.alreadyCheckedIn, {
        name: registration.user.name,
        when: whenOf(pass.checkedInAt ?? registration.checkedInAt),
      }),
    };
  }

  if (!membership && user.role === "ADMIN") return { error: await say("ticketNotFound") };

  const marked = await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.updateMany({
      where: { id: pass.id, checkedInAt: null },
      data: { checkedInAt: now },
    });
    if (updated.count !== 1) return false;
    const remaining = await tx.ticket.count({
      where: { registrationId: registration.id, checkedInAt: null },
    });
    if (remaining === 0) {
      await tx.registration.update({
        where: { id: registration.id },
        data: { status: "CHECKED_IN", checkedInAt: registration.checkedInAt ?? now },
      });
    }
    return true;
  });

  if (!marked) {
    return {
      error: tReplace(t.errors.alreadyCheckedIn, {
        name: registration.user.name,
        when: "",
      }),
    };
  }

  revalidatePath("/dashboard/check-in");
  revalidatePath("/dashboard/registrations");
  revalidatePath("/my/tickets");
  return {
    success: true as const,
    attendee: {
      name: registration.user.name,
      email: registration.user.email,
      event: registration.event.title,
      seatLabel:
        registration.quantity > 1
          ? tReplace(t.myTickets.ticketNumber, {
              n: String(pass.position),
              total: String(registration.quantity),
            })
          : null,
    },
  };
}
