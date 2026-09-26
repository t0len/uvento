import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";

export default async function AdminOrganizationsPage() {
  await requireRole("ADMIN");
  const { t } = await getI18n();

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      _count: { select: { events: true } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.admin.orgsTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.admin.orgsSub}</p>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">{t.admin.orgsSub}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{org.name}</h2>
                  <p className="text-sm text-gray-500">/{org.slug}</p>
                  {org.description && (
                    <p className="mt-2 text-sm text-gray-600">{org.description}</p>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {org._count.events} {t.admin.events.toLowerCase()}
                </p>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Members
                </p>
                {org.members.length === 0 ? (
                  <p className="text-sm text-gray-500">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {org.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center gap-2 text-sm text-gray-700"
                      >
                        <span className="font-medium">{m.user.name}</span>
                        <span className="text-gray-400">{m.user.email}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {m.role}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                          {m.user.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
