import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { QRTicket } from "./qr-ticket";

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

  const upcoming = registrations.filter((r) => new Date(r.event.endDate) >= new Date());
  const past = registrations.filter((r) => new Date(r.event.endDate) < new Date());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.myTickets.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {tReplace(t.myTickets.count, { count: registrations.length })}
      </p>

      {registrations.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">{t.myTickets.empty}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">{t.myTickets.upcoming}</h2>
              <div className="space-y-4">
                {upcoming.map((reg) => (
                  <TicketCard key={reg.id} registration={reg} locale={locale} t={t} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-500">{t.myTickets.past}</h2>
              <div className="space-y-4 opacity-60">
                {past.map((reg) => (
                  <TicketCard key={reg.id} registration={reg} locale={locale} t={t} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type TicketRegistration = {
  id: string;
  ticketCode: string;
  status: string;
  checkedInAt: Date | null;
  event: {
    title: string;
    slug: string;
    startDate: Date;
    endDate: Date;
    location: string;
    venue: string | null;
  };
};

function TicketCard({
  registration,
  locale,
  t,
}: {
  registration: TicketRegistration;
  locale: "ru" | "kk" | "en";
  t: Awaited<ReturnType<typeof getI18n>>["t"];
}) {
  const label =
    registration.status === "PENDING"
      ? t.events.pendingPayment
      : t.status[registration.status as keyof typeof t.status] || registration.status;

  const colors: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    CHECKED_IN: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{registration.event.title}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {new Date(registration.event.startDate).toLocaleDateString(localeDate[locale], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          {" · "}
          {registration.event.location}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[registration.status] || "bg-gray-100 text-gray-700"}`}
          >
            {label}
          </span>
          <span className="text-xs text-gray-400">#{registration.ticketCode.slice(-8)}</span>
        </div>
      </div>
      {registration.status === "CONFIRMED" && (
        <QRTicket ticketCode={registration.ticketCode} eventTitle={registration.event.title} />
      )}
    </div>
  );
}
