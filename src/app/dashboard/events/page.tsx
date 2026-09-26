import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getI18n, localeDate } from "@/lib/i18n";

export default async function DashboardEventsPage() {
  const user = await requireRole("ORGANIZER");
  const { locale, t } = await getI18n();

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const events = membership
    ? await prisma.event.findMany({
        where: { organizationId: membership.organizationId },
        include: { _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.events}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tReplaceCount(t.dashboard.total, events.length)}
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + {t.dashboard.newEvent}
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">{t.dashboard.noEvents}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.events}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  {t.dashboard.date}
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.status}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.registrations}</th>
                <th className="px-4 py-3 font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.location}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                    {new Date(event.startDate).toLocaleDateString(localeDate[locale], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={event.status}
                      label={t.status[event.status as keyof typeof t.status] || event.status}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {event._count.registrations}/{event.capacity}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      {t.dashboard.manage}
                    </Link>
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

function tReplaceCount(template: string, count: number) {
  return template.replace("{count}", String(count));
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PUBLISHED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {label}
    </span>
  );
}
