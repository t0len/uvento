import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { RoleSelect } from "./role-select";

export default async function AdminUsersPage() {
  const admin = await requireRole("ADMIN");
  const { t } = await getI18n();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organizationMemberships: {
        include: { organization: { select: { name: true, slug: true } } },
      },
      _count: { select: { registrations: true } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.admin.users}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.admin.usersRolesSub}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">{t.common.user}</th>
              <th className="hidden px-4 py-3 font-medium text-gray-700 md:table-cell">
                {t.admin.organizations}
              </th>
              <th className="px-4 py-3 font-medium text-gray-700">{t.common.role}</th>
              <th className="hidden px-4 py-3 font-medium text-gray-700 sm:table-cell">
                {t.dashboard.registrations}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                  {u.organizationMemberships.length === 0
                    ? "—"
                    : u.organizationMemberships
                        .map((m) => m.organization.name)
                        .join(", ")}
                </td>
                <td className="px-4 py-3">
                  <RoleSelect
                    userId={u.id}
                    currentRole={u.role}
                    disabled={u.id === admin.id}
                  />
                </td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                  {u._count.registrations}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
