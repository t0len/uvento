import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { filterQuery, registrationWhere, type RegistrationFilters } from "@/lib/registration-filters";
import { ConfirmPaymentButton } from "./confirm-payment-button";
import { RemoveParticipantButton } from "./remove-participant-button";

const STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CANCELLED"] as const;

export default async function DashboardRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<RegistrationFilters>;
}) {
  const user = await requireRole("ORGANIZER");
  const filters = await searchParams;
  const { locale, t } = await getI18n();

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const events = membership
    ? await prisma.event.findMany({
        where: { organizationId: membership.organizationId },
        select: { id: true, title: true },
        orderBy: { startDate: "desc" },
      })
    : [];

  const registrations = membership
    ? await prisma.registration.findMany({
        where: registrationWhere(membership.organizationId, filters),
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { title: true, slug: true, price: true } },
          payment: { select: { status: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    CHECKED_IN: "bg-blue-100 text-blue-700",
  };
  const filtering = Boolean(filters.q || filters.status || filters.event || filters.payment);
  const exportHref = `/dashboard/registrations/export?${filterQuery(filters).toString()}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.registrations}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tReplace(t.dashboard.total, { count: registrations.length })}
          </p>
        </div>
        <Link
          href={exportHref}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t.dashboard.exportList}
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={filters.q}
          placeholder={t.dashboard.searchAttendees}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-gray-500"
        />
        <select
          name="event"
          defaultValue={filters.event || ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t.dashboard.allEventsFilter}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filters.status || ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t.dashboard.allStatuses}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t.status[status]}
            </option>
          ))}
        </select>
        <select
          name="payment"
          defaultValue={filters.payment || ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t.dashboard.allPayments}</option>
          <option value="PENDING">{t.payment.PENDING}</option>
          <option value="COMPLETED">{t.payment.COMPLETED}</option>
          <option value="NONE">{t.payment.none}</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t.events.search}
        </button>
      </form>

      {registrations.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">
          {filtering ? t.dashboard.noFilterResults : t.dashboard.noRegistrations}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.attendee}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.events}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  {t.dashboard.date}
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.status}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 md:table-cell">
                  {t.dashboard.payment}
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{reg.user.name}</p>
                    <p className="text-xs text-gray-500">{reg.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{reg.event.title}</td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                    {new Date(reg.createdAt).toLocaleDateString(localeDate[locale], {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[reg.status] || "bg-gray-100"}`}
                    >
                      {t.status[reg.status as keyof typeof t.status] || reg.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-gray-600">
                      {reg.payment
                        ? t.payment[reg.payment.status as keyof typeof t.payment] || reg.payment.status
                        : t.payment.none}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {reg.status === "PENDING" && reg.event.price > 0 && (
                        <ConfirmPaymentButton registrationId={reg.id} />
                      )}
                      {reg.status !== "CANCELLED" && reg.status !== "CHECKED_IN" && (
                        <RemoveParticipantButton registrationId={reg.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
