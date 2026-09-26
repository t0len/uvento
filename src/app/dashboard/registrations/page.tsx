import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { ConfirmPaymentButton } from "./confirm-payment-button";

export default async function DashboardRegistrationsPage() {
  const user = await requireRole("ORGANIZER");
  const { locale, t } = await getI18n();

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const registrations = membership
    ? await prisma.registration.findMany({
        where: { event: { organizationId: membership.organizationId } },
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.registrations}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {tReplace(t.dashboard.total, { count: registrations.length })}
      </p>

      {registrations.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">{t.dashboard.noRegistrations}</div>
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
                  <td className="px-4 py-3">
                    {reg.status === "PENDING" && reg.event.price > 0 && (
                      <ConfirmPaymentButton registrationId={reg.id} />
                    )}
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
