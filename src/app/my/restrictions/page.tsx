import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { historyEntry } from "@/lib/blacklist";
import { BlockHistory } from "@/components/blacklist/history";

export default async function RestrictionsPage() {
  const user = await requireAuth();
  const { t } = await getI18n();

  const rows = await prisma.organizationBlacklist.findMany({
    where: { userId: user.id },
    include: {
      organization: { select: { name: true } },
      entries: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, lastName: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.blacklist.myTitle}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.blacklist.mySub}</p>

      {rows.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">{t.blacklist.myEmpty}</div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <section key={row.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-900">{row.organization.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    row.active ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {row.active ? t.blacklist.blockedNow : t.blacklist.clearNow}
                </span>
              </div>
              <div className="mt-4">
                <BlockHistory entries={row.entries.map(historyEntry)} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
