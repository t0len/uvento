import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, localeDate } from "@/lib/i18n";
import { errorText } from "@/lib/error-text";
import { countTickets, formatEventDate } from "@/lib/format";
import { releaseExpiredReservations } from "@/lib/reservations";
import { fulfillCheckoutSession } from "@/lib/stripe-checkout";
import { syncTicketPasses } from "@/lib/tickets";
import { TicketList, type TicketItem } from "./ticket-list";

export default async function MyTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireAuth();
  const { locale, t } = await getI18n();
  const { session_id: sessionId } = await searchParams;
  let paymentNotice: string | null = null;
  if (sessionId) {
    const result = await fulfillCheckoutSession(sessionId, user.id);
    if ("error" in result && result.error) paymentNotice = errorText(t, result.error);
  }
  await releaseExpiredReservations();

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
  const passLists = await Promise.all(
    registrations.map((registration) =>
      registration.status === "CONFIRMED" || registration.status === "CHECKED_IN"
        ? syncTicketPasses(prisma, registration)
        : Promise.resolve([]),
    ),
  );
  const tickets: TicketItem[] = registrations.map((registration, index) => {
    const statusLabel =
      registration.status === "PENDING"
        ? t.events.pendingPayment
        : t.status[registration.status as keyof typeof t.status] || registration.status;
    return {
      id: registration.id,
      status: registration.status,
      statusLabel,
      title: registration.event.title,
      slug: registration.event.slug,
      when: formatEventDate(registration.event.startDate, localeDate[locale], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      place: [registration.event.venue, registration.event.location].filter(Boolean).join(" · "),
      upcoming: registration.event.endDate ? registration.event.endDate >= now : true,
      quantity: registration.quantity,
      passes: passLists[index].map((pass) => ({
        code: pass.code,
        position: pass.position,
        checkedInAt: pass.checkedInAt?.toISOString() ?? null,
      })),
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.myTickets.title}</h1>
      {paymentNotice ? <p className="mt-4 text-sm text-red-600">{paymentNotice}</p> : null}
      <p className="mt-1 text-sm text-gray-500">
        {tickets.length === 0
          ? t.myTickets.subtitle
          : countTickets(
              tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
              locale,
            )}
      </p>
      <TicketList tickets={tickets} />
    </div>
  );
}
