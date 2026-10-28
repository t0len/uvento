import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, tReplace } from "@/lib/i18n";
import { RoleSelect } from "./role-select";
import { BlockButton } from "./block-button";
import { CreateOrganizerForm, DeleteUserButton } from "./user-controls";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireRole("ADMIN");
  const { q } = await searchParams;
  const { t } = await getI18n();
  const query = q?.trim();

  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      organizationMemberships: {
        include: { organization: { select: { name: true, slug: true } } },
      },
      _count: { select: { registrations: true } },
    },
  }),
    prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.admin.users}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.admin.usersRolesSub} · {tReplace(t.dashboard.total, { count: users.length })}
          </p>
        </div>
        <form>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder={t.admin.searchUsers}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-gray-500"
          />
        </form>
      </div>

      <CreateOrganizerForm organizations={organizations} />

      {users.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">{t.admin.noUsers}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
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
                <th className="px-4 py-3 font-medium text-gray-700">{t.dashboard.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    {u.blocked && <p className="text-xs font-medium text-red-600">{t.admin.blocked}</p>}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                    {u.organizationMemberships.length === 0
                      ? "—"
                      : u.organizationMemberships.map((m) => m.organization.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect userId={u.id} currentRole={u.role} disabled={u.id === admin.id} />
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{u._count.registrations}</td>
                  <td className="px-4 py-3">
                    {u.id === admin.id ? (
                      "—"
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <BlockButton userId={u.id} blocked={u.blocked} />
                        <DeleteUserButton userId={u.id} />
                      </div>
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
