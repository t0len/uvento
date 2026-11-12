import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { membershipOrganizations } from "@/lib/organizations";
import Link from "next/link";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { formatEventDate, formatKzt } from "@/lib/format";
import { occupiedSeatsByEvent } from "@/lib/seats";
import { releaseExpiredReservations } from "@/lib/reservations";

export default async function DashboardPage() {
  const user = await requireRole("ORGANIZER");
  const { locale, t } = await getI18n();

  await releaseExpiredReservations();
  const organizations = await membershipOrganizations(user.id);
  const orgIds = organizations.map((org) => org.id);
  const hasOrgs = orgIds.length > 0;
  const now = new Date();
  const orgEvent = { organizationId: { in: orgIds } };

  const [upcomingCount, ticketsSoldAgg, checkedInAgg, revenueAgg, events, attendedRows] = await Promise.all([
    hasOrgs
      ? prisma.event.count({
          where: { ...orgEvent, status: "PUBLISHED", endDate: { gte: now } },
        })
      : 0,
    hasOrgs
      ? prisma.registration.aggregate({
          where: {
            event: orgEvent,
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
          },
          _sum: { quantity: true },
        })
      : null,
    hasOrgs
      ? prisma.ticket.findMany({
          where: {
            checkedInAt: { not: null },
            registration: { status: { in: ["CONFIRMED", "CHECKED_IN"] }, event: orgEvent },
          },
          select: { registration: { select: { eventId: true } } },
        })
      : [],
    hasOrgs
      ? prisma.payment.aggregate({
          where: {
            status: "COMPLETED",
            registration: {
              status: { in: ["CONFIRMED", "CHECKED_IN"] },
              event: orgEvent,
            },
          },
          _sum: { amount: true },
        })
      : null,
    hasOrgs
      ? prisma.event.findMany({
          where: orgEvent,
          orderBy: { startDate: "asc" },
        })
      : [],
    hasOrgs
      ? prisma.registration.groupBy({
          by: ["eventId"],
          where: { status: "CHECKED_IN", event: orgEvent },
          _sum: { quantity: true },
        })
      : [],
  ]);
  const attendedByEvent = new Map(attendedRows.map((row) => [row.eventId, row._sum.quantity ?? 0]));
  const seats = await occupiedSeatsByEvent(events.map((event) => event.id));

  const revenue = revenueAgg?._sum.amount ?? 0;
  const ticketsSold = ticketsSoldAgg?._sum.quantity ?? 0;
  const checkedIn = checkedInAgg?._sum.quantity ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
  const checkedIn = [...attendedByEvent.values()].reduce((sum, count) => sum + count, 0);
          <p className="mt-1 text-sm text-gray-500">{t.dashboard.managePerformance}</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + {t.dashboard.newEvent}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.dashboard.upcomingEvents} value={String(upcomingCount)} />
        <Stat label={t.dashboard.ticketsSold} value={String(ticketsSold)} />
        <Stat label={t.dashboard.checkedInStat} value={String(checkedIn)} />
        <Stat label={t.dashboard.revenue} value={formatKzt(revenue, t.common.free, locale)} />
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold text-gray-900">{t.dashboard.yourEvents}</h2>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">{t.dashboard.noEvents}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.eventName}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  {t.dashboard.date}
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.seats}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.attendance}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.status}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => {
                const isUpcoming = event.status === "PUBLISHED" && event.endDate != null && event.endDate >= now;
                const label = isUpcoming
                  ? t.dashboard.upcoming
                  : t.status[event.status as keyof typeof t.status] || event.status;
                return (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{event.title}</td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                      {formatEventDate(event.startDate, localeDate[locale])}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(seats.get(event.id) ?? 0)}/{event.capacity ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{attendedByEvent.get(event.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
                      >
                        {t.dashboard.viewAttendees}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        {tReplace(t.dashboard.subtitle, { name: user.name })}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
