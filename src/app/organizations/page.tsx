import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { getI18n, tReplace } from "@/lib/i18n";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { t } = await getI18n();
  const query = q?.trim();

  const organizations = await prisma.organization.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: {
        select: {
          members: true,
          events: { where: { status: "PUBLISHED" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{t.orgs.title}</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-500">{t.orgs.subtitle}</p>

        <form className="mt-6">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder={t.orgs.searchPlaceholder}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
        </form>

        <h2 className="mb-4 mt-8 text-lg font-semibold text-gray-900">{t.orgs.all}</h2>

        {organizations.length === 0 ? (
          <p className="py-16 text-center text-gray-500">{t.orgs.empty}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/organizations/${org.slug}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-gray-200 text-xs text-gray-400">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "Logo"
                  )}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{org.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-gray-500">
                  {org.description}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  {tReplace(t.orgs.events, { count: org._count.events })}
                  {" · "}
                  {tReplace(t.orgs.members, { count: org._count.members })}
                </p>
                <span className="mt-4 inline-flex text-sm font-medium text-gray-700">
                  {t.orgs.view} →
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
