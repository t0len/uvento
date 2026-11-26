import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { membershipOrganizations } from "@/lib/organizations";
import { getI18n } from "@/lib/i18n";
import { ReviewButton } from "@/components/blacklist/review-button";

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
        active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {label}
      <span
        className={`min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

export default async function BlockedUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const past = status === "unblocked";
  const user = await requireRole("ORGANIZER");
  const { t } = await getI18n();
  const organizations = await membershipOrganizations(user.id);
  const orgIds = organizations.map((org) => org.id);

  const [rows, counts] =
    orgIds.length > 0
      ? await Promise.all([
          prisma.organizationBlacklist.findMany({
            where: { organizationId: { in: orgIds }, active: !past },
            select: {
              id: true,
              user: { select: { name: true, lastName: true, phone: true, email: true } },
              organization: { select: { name: true } },
            },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.organizationBlacklist.groupBy({
            by: ["active"],
            where: { organizationId: { in: orgIds } },
            _count: { _all: true },
          }),
        ])
      : [[], []];

  let blockedCount = 0;
  let clearCount = 0;
  for (const row of counts) {
    if (row.active) blockedCount = row._count._all;
    else clearCount = row._count._all;
  }

  const showOrganization = organizations.length > 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.blacklist.title}</h1>
      <p className="mt-1 text-sm text-gray-500">{past ? t.blacklist.subtitlePast : t.blacklist.subtitle}</p>

      <div
        role="group"
        aria-label={t.blacklist.filter}
        className="mt-5 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1"
      >
        <FilterLink
          href="/dashboard/blocked"
          active={!past}
          label={t.blacklist.filterCurrent}
          count={blockedCount}
        />
        <FilterLink
          href="/dashboard/blocked?status=unblocked"
          active={past}
          label={t.blacklist.filterPast}
          count={clearCount}
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">
          {past ? t.blacklist.emptyPast : t.blacklist.empty}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">{t.common.name}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.common.lastName}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.common.phone}</th>
                <th className="px-4 py-3 font-medium text-gray-700">{t.common.email}</th>
                {showOrganization ? (
                  <th className="px-4 py-3 font-medium text-gray-700">{t.my.organization}</th>
                ) : null}
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.user.name}</td>
                  <td className="px-4 py-3 text-gray-700">{row.user.lastName || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{row.user.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{row.user.email}</td>
                  {showOrganization ? (
                    <td className="px-4 py-3 text-gray-700">{row.organization.name}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <ReviewButton
                      blacklistId={row.id}
                      name={[row.user.name, row.user.lastName].filter(Boolean).join(" ")}
                      email={row.user.email}
                      phone={row.user.phone}
                    />
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
