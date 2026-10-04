import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { TicketList, type TicketItem } from "./ticket-list";

export default async function MyTicketsPage() {
  const user = await requireAuth();
  const { locale, t } = await getI18n();

  const registrations = await prisma.registration.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    include: {
      event: {
        select: {
          title: true,
          slug: true,
          startDate: true,
          endDate: true,
          location: true,
          venue: true,
        },
      },
    },
    orderBy: { event: { startDate: "asc" } },
  });

  const now = new Date();
  const tickets: TicketItem[] = registrations.map((registration) => {
    const statusLabel =
      registration.status === "PENDING"
        ? t.events.pendingPayment
        : t.status[registration.status as keyof typeof t.status] || registration.status;
    return {
      id: registration.id,
      ticketCode: registration.ticketCode,
      status: registration.status,
      statusLabel,
      title: registration.event.title,
      slug: registration.event.slug,
      when: new Date(registration.event.startDate).toLocaleDateString(localeDate[locale], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      place: [registration.event.venue, registration.event.location].filter(Boolean).join(" · "),
      upcoming: new Date(registration.event.endDate) >= now,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.myTickets.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {tickets.length === 0 ? t.myTickets.subtitle : tReplace(t.myTickets.count, { count: tickets.length })}
      </p>
      <TicketList tickets={tickets} />
    </div>
  );
}
