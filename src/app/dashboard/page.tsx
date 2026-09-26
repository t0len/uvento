import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getI18n, tReplace } from "@/lib/i18n";

export default async function DashboardPage() {
  const user = await requireRole("ORGANIZER");
  const { t } = await getI18n();

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const orgId = membership?.organizationId;

  const [eventCount, registrationCount, revenue] = await Promise.all([
    orgId ? prisma.event.count({ where: { organizationId: orgId } }) : 0,
    orgId
      ? prisma.registration.count({
          where: { event: { organizationId: orgId }, status: { not: "CANCELLED" } },
        })
      : 0,
    orgId
      ? prisma.payment.aggregate({
          where: {
            registration: { event: { organizationId: orgId } },
            status: "COMPLETED",
          },
          _sum: { amount: true },
        })
      : { _sum: { amount: null } },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {tReplace(t.dashboard.subtitle, { name: user.name })}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          href="/dashboard/events"
          title={t.dashboard.events}
          description={t.dashboard.manage}
          count={`${eventCount}`}
        />
        <DashboardCard
          href="/dashboard/registrations"
          title={t.dashboard.registrations}
          description={t.dashboard.confirmPayment}
          count={`${registrationCount}`}
        />
        <DashboardCard
          href="/dashboard/check-in"
          title={t.dashboard.checkIn}
          description={t.dashboard.checkInHint}
          count={t.dashboard.submitCheckIn}
        />
        <DashboardCard
          href="/dashboard/events/new"
          title={t.dashboard.createEvent}
          description={t.dashboard.newEvent}
          count={t.dashboard.newEvent}
        />
        <DashboardCard
          href="/dashboard/registrations"
          title="Revenue"
          description="KZT"
          count={`${revenue._sum?.amount || 0} KZT`}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  title,
  description,
  count,
}: {
  href: string;
  title: string;
  description: string;
  count: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
