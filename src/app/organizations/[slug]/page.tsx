import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { EventCover } from "@/components/events/event-cover";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, t } = await getI18n();

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      _count: { select: { members: true } },
      events: {
        where: { status: "PUBLISHED" },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!org) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Link href="/organizations" className="text-sm text-gray-500 hover:text-gray-800">
          ← {t.orgs.back}
        </Link>
        <div className="mt-6 flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-200 text-xs text-gray-400">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              "Logo"
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
            {org.description && <p className="mt-2 text-sm text-gray-600">{org.description}</p>}
            <p className="mt-2 text-xs text-gray-400">
              {tReplace(t.orgs.members, { count: org._count.members })}
              {org.contactEmail ? ` · ${t.orgs.contact}: ${org.contactEmail}` : ""}
            </p>
          </div>
        </div>

        <h2 className="mb-4 mt-10 text-lg font-semibold text-gray-900">{t.nav.events}</h2>
        {org.events.length === 0 ? (
          <p className="text-sm text-gray-500">{t.orgs.noEvents}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {org.events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-md"
              >
                <EventCover url={event.coverImageUrl} label={t.eventDetail.photo} className="h-36 w-full" />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(event.startDate).toLocaleDateString(localeDate[locale], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" · "}
                    {event.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
