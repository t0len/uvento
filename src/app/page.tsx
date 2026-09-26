import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n, localeDate } from "@/lib/i18n";
import { UserMenu } from "@/components/layout/user-menu";
import { LanguageSwitcher } from "@/components/i18n/i18n-provider";

export default async function HomePage() {
  const session = await auth();
  const { locale, t } = await getI18n();

  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    include: {
      categories: { include: { category: true } },
      _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
    },
    orderBy: { startDate: "asc" },
    take: 6,
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Uvento
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/events"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t.nav.events}
              </Link>
              <Link
                href="/organizations"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t.nav.organizations}
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t.nav.about}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            {session?.user ? (
              <UserMenu
                name={session.user.name || t.common.user}
                email={session.user.email || ""}
                role={session.user.role || "STUDENT"}
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  {t.nav.signup}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-12">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="flex-1">
              <h1 className="text-5xl font-bold leading-tight tracking-tight text-gray-900">
                {t.home.heroTitle1}
                <br />
                {t.home.heroTitle2}
              </h1>
              <p className="mt-4 max-w-md text-lg text-gray-500">
                {t.home.heroSubtitle}
              </p>
              <div className="mt-6">
                <Link
                  href="/events"
                  className="inline-flex rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  {t.home.browseEvents}
                </Link>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-200 md:h-80">
                <span className="text-lg text-gray-400">{t.home.eventPhoto}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
            <Feature
              title={t.home.discover}
              subtitle={t.home.discoverSub}
              icon="cal"
            />
            <Feature
              title={t.home.bookPay}
              subtitle={t.home.bookPaySub}
              icon="pay"
            />
            <Feature
              title={t.home.getTicket}
              subtitle={t.home.getTicketSub}
              icon="ticket"
            />
            <Feature
              title={t.home.checkIn}
              subtitle={t.home.checkInSub}
              icon="check"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t.home.popular}</h2>
            <Link
              href="/events"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
            >
              {t.home.viewAll}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center text-gray-400">{t.home.noEvents}</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
                >
                  <div className="flex h-44 items-center justify-center bg-gray-200">
                    <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {new Date(event.startDate).toLocaleDateString(localeDate[locale], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>{event.location}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1">
                        {event.categories.slice(0, 2).map((ec) => (
                          <span
                            key={ec.categoryId}
                            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
                          >
                            {ec.category.name}
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-400 transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Feature({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: "cal" | "pay" | "ticket" | "check";
}) {
  const paths: Record<typeof icon, string> = {
    cal: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    pay: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    ticket:
      "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
    check:
      "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
        <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[icon]} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
