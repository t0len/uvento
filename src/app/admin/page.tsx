import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getI18n, tReplace } from "@/lib/i18n";

export default async function AdminPage() {
  const user = await requireRole("ADMIN");
  const { t } = await getI18n();

  const [userCount, orgCount, eventCount, registrationCount, pendingPayments] =
    await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.event.count(),
      prisma.registration.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

  const roleBreakdown = await prisma.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });

  const roles = Object.fromEntries(
    roleBreakdown.map((r) => [r.role, r._count.role])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.admin.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {tReplace(t.admin.subtitle, { name: user.name })}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.admin.users} value={String(userCount)} />
        <Stat label={t.admin.organizations} value={String(orgCount)} />
        <Stat label={t.admin.events} value={String(eventCount)} />
        <Stat label={t.dashboard.registrations} value={String(registrationCount)} />
      </div>

      <p className="mb-6 text-sm text-gray-500">
        ADMIN {roles.ADMIN ?? 0} · ORGANIZER {roles.ORGANIZER ?? 0} · STUDENT{" "}
        {roles.STUDENT ?? 0}
        {pendingPayments > 0 ? ` · pending ${pendingPayments}` : ""}
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AdminCard
          href="/admin/users"
          title={t.admin.usersRoles}
          description={t.admin.usersRolesSub}
        />
        <AdminCard
          href="/admin/organizations"
          title={t.admin.orgsTitle}
          description={t.admin.orgsSub}
        />
        <AdminCard
          href="/admin/events"
          title={t.admin.allEvents}
          description={t.admin.allEventsSub}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function AdminCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
    >
      <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
