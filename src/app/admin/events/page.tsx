import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, localeDate } from "@/lib/i18n";
import { CancelEventButton } from "./cancel-event-button";

export default async function AdminEventsPage() {
  await requireRole("ADMIN");
  const { locale, t } = await getI18n();

  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
    include: {
      organization: { select: { name: true, slug: true } },
      _count: {
        select: { registrations: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.admin.allEvents}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.admin.allEventsSub}</p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">{t.common.noEvents}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">{t.admin.events}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 md:table-cell">
                  {t.admin.organizations}
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.status}</th>
                <th className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                  {t.dashboard.registrations}
                </th>
                <th className="px-4 py-3 font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.startDate).toLocaleDateString(localeDate[locale], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                    {event.organization.name}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={event.status}
                      label={t.status[event.status as keyof typeof t.status] || event.status}
                    />
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                    {event._count.registrations}/{event.capacity}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {event.status === "PUBLISHED" && (
                        <Link
                          href={`/events/${event.slug}`}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          {t.admin.view}
                        </Link>
                      )}
                      {event.status !== "CANCELLED" && (
                        <CancelEventButton eventId={event.id} />
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
