import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getI18n, localeDate } from "@/lib/i18n";
import { formatEventDate, formatKzt, formatKztAmount } from "@/lib/format";
import { completedRevenue, displayPayment } from "@/lib/payments";
import { personName } from "@/lib/person";
import { forgetExpiredReservations } from "@/lib/reservations";
import { EventActions } from "./event-actions";
import { BlockAction } from "@/components/blacklist/block-action";

export default async function DashboardEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await forgetExpiredReservations();
  const user = await requireRole("ORGANIZER");
  const { locale, t } = await getI18n();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organization: { include: { members: { select: { userId: true } } } },
      categories: { include: { category: true } },
      registrations: {
        include: {
          user: { select: { id: true, name: true, lastName: true, phone: true, email: true } },
          payments: { select: { status: true, amount: true, quantity: true, reservedUntil: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) notFound();

  const blockedRows = await prisma.organizationBlacklist.findMany({
    where: { organizationId: event.organizationId, active: true },
    select: { userId: true },
  });
  const blockedIds = new Set(blockedRows.map((row) => row.userId));

  const isMember = event.organization.members.some((m) => m.userId === user.id);
  if (!isMember) notFound();

  const now = new Date();
  const heldSeats = event.registrations.reduce((sum, registration) => {
    if (registration.status === "CANCELLED") return sum;
    const addon = registration.payments
      .filter(
        (payment) =>
          (registration.status === "CONFIRMED" || registration.status === "CHECKED_IN") &&
          payment.status === "PENDING" &&
          payment.reservedUntil != null &&
          payment.reservedUntil > now,
      )
      .reduce((seats, payment) => seats + payment.quantity, 0);
    return sum + registration.quantity + addon;
  }, 0);
  if (!isMember) notFound();

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PUBLISHED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words text-2xl font-bold text-gray-900">{event.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[event.status]}`}>
              {t.status[event.status as keyof typeof t.status] || event.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatEventDate(event.startDate, localeDate[locale], {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {event.location}
          </p>
        </div>
        <EventActions
          eventId={event.id}
          status={event.status}
          canDelete={event.status === "DRAFT" || heldSeats === 0}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t.dashboard.registrations}
          value={`${heldSeats}/${event.capacity ?? "—"}`}
        />
        <StatCard
          label={t.eventDetail.price}
          value={formatKzt(event.price, t.common.free, locale)}
        />
        <StatCard
          label={t.dashboard.revenue}
          value={formatKztAmount(
            event.registrations
              .filter(
                (registration) =>
                  registration.status === "CONFIRMED" || registration.status === "CHECKED_IN",
              )
              .reduce((sum, registration) => sum + completedRevenue(registration.payments), 0),
            locale,
          )}
        />
      </div>

      <div className="mt-6 min-w-0 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">{t.dashboard.recentRegistrations}</h2>
          <Link href="/dashboard/registrations" className="text-sm text-gray-500 hover:text-gray-700">
            {t.dashboard.viewAll}
          </Link>
        </div>
        {event.registrations.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">{t.dashboard.noRegistrations}</div>
        ) : (
          <div className="min-w-0 overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">{t.dashboard.name}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-600 sm:table-cell">{t.dashboard.email}</th>
                <th className="px-4 py-3 font-medium text-gray-600">{t.dashboard.status}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-600 md:table-cell">{t.dashboard.payment}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t.dashboard.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {event.registrations.map((reg) => (
                <tr key={reg.id}>
                  <td className="px-4 py-3 text-gray-900">
                    <span className="font-medium">{personName(reg.user)}</span>
                    {blockedIds.has(reg.user.id) ? (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t.blacklist.blocked}
                      </span>
                    ) : null}
                    {reg.status !== "CANCELLED" && reg.quantity > 1 ? (
                      <span className="ml-2 text-xs text-gray-500">×{reg.quantity}</span>
                    ) : null}
                    {reg.user.phone ? <p className="text-xs text-gray-500">{reg.user.phone}</p> : null}
                  </td>
                  <td className="hidden overflow-hidden px-4 py-3 text-gray-500 sm:table-cell">
                    <span className="block truncate" title={reg.user.email}>
                      {reg.user.email}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <RegBadge
                      status={reg.status}
                      label={t.status[reg.status as keyof typeof t.status] || reg.status}
                    />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-gray-500 md:table-cell">
                    {(() => {
                      const payment = displayPayment(reg.payments);
                      return payment
                        ? t.payment[payment.status as keyof typeof t.payment] || payment.status
                        : t.payment.none;
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {reg.user.id === user.id ? null : (
                      <BlockAction
                        userId={reg.user.id}
                        organizationId={event.organizationId}
                        blocked={blockedIds.has(reg.user.id)}
                        name={personName(reg.user)}
                        email={reg.user.email}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function RegBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    CHECKED_IN: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {label}
    </span>
  );
}
