import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { membershipOrganizations } from "@/lib/organizations";
import { getI18n } from "@/lib/i18n";
import { historyEntry } from "@/lib/blacklist";
import { ReviewButton } from "@/components/blacklist/review-button";

export default async function BlockedUsersPage() {
  const user = await requireRole("ORGANIZER");
  const { t } = await getI18n();
  const organizations = await membershipOrganizations(user.id);
  const orgIds = organizations.map((org) => org.id);

  const rows =
    orgIds.length > 0
      ? await prisma.organizationBlacklist.findMany({
          where: { organizationId: { in: orgIds }, active: true },
          include: {
            user: { select: { name: true, lastName: true, phone: true, email: true } },
            organization: { select: { id: true, name: true } },
            entries: {
              orderBy: { createdAt: "desc" },
              include: { actor: { select: { name: true, lastName: true } } },
            },
          },
          orderBy: { updatedAt: "desc" },
        })
      : [];

  const showOrganization = organizations.length > 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.blacklist.title}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.blacklist.subtitle}</p>

      {rows.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">{t.blacklist.empty}</div>
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
                      name={[row.user.name, row.user.lastName].filter(Boolean).join(" ")}
                      email={row.user.email}
                      phone={row.user.phone}
                      entries={row.entries.map(historyEntry)}
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
