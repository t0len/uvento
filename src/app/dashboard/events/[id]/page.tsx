import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getI18n, localeDate } from "@/lib/i18n";
import { EventActions } from "./event-actions";

export default async function DashboardEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ORGANIZER");
  const { locale, t } = await getI18n();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organization: { include: { members: { select: { userId: true } } } },
      categories: { include: { category: true } },
      registrations: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
    },
  });

  if (!event) notFound();

  const isMember = event.organization.members.some((m) => m.userId === user.id);
  if (!isMember) notFound();

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PUBLISHED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[event.status]}`}>
              {t.status[event.status as keyof typeof t.status] || event.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(event.startDate).toLocaleDateString(localeDate[locale], {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {event.location}
          </p>
        </div>
        <EventActions eventId={event.id} status={event.status} slug={event.slug} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <StatCard
            label={t.dashboard.registrations}
            value={`${event._count.registrations}/${event.capacity}`}
          />
          <StatCard
            label={t.eventDetail.price}
            value={event.price > 0 ? `${event.price} KZT` : t.common.free}
          />
          <StatCard
            label={t.dashboard.revenue}
            value={`${event.price * event.registrations.filter((r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN").length} KZT`}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{t.dashboard.recentRegistrations}</h2>
              <Link href="/dashboard/registrations" className="text-sm text-gray-500 hover:text-gray-700">
                {t.dashboard.viewAll}
              </Link>
            </div>
            {event.registrations.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">{t.dashboard.noRegistrations}</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-600">{t.dashboard.name}</th>
                    <th className="hidden px-4 py-2 font-medium text-gray-600 sm:table-cell">
                      {t.dashboard.email}
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-600">{t.dashboard.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {event.registrations.map((reg) => (
                    <tr key={reg.id}>
                      <td className="px-4 py-2 text-gray-900">{reg.user.name}</td>
                      <td className="hidden px-4 py-2 text-gray-500 sm:table-cell">{reg.user.email}</td>
                      <td className="px-4 py-2">
                        <RegBadge
                          status={reg.status}
                          label={t.status[reg.status as keyof typeof t.status] || reg.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
