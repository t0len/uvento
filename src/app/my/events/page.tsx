import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getI18n, localeDate } from "@/lib/i18n";

export default async function MyEventsPage() {
  const user = await requireAuth();
  const { locale, t } = await getI18n();

  const registrations = await prisma.registration.findMany({
    where: { userId: user.id },
    include: {
      event: {
        select: {
          title: true,
          slug: true,
          startDate: true,
          location: true,
          status: true,
          organization: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.my.events}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.my.eventsSub}</p>

      {registrations.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">{t.my.noEvents}</p>
          <Link
            href="/events"
            className="mt-4 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t.home.browseEvents}
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">{t.nav.events}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  {t.dashboard.date}
                </th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 md:table-cell">
                  {t.menu.roleOrganizer}
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.my.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/events/${reg.event.slug}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {reg.event.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-gray-500 sm:hidden">
                      {new Date(reg.event.startDate).toLocaleDateString(localeDate[locale], {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                    {new Date(reg.event.startDate).toLocaleDateString(localeDate[locale], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                    {reg.event.organization.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        reg.status === "CONFIRMED"
                          ? "bg-green-100 text-green-700"
                          : reg.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : reg.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {t.status[reg.status as keyof typeof t.status] || reg.status}
                    </span>
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
