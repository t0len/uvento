import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { EventCover } from "@/components/events/event-cover";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { formatKzt } from "@/lib/format";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { locale, t } = await getI18n();
  const pageSize = 9;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Record<string, unknown> = {
    status: "PUBLISHED",
    endDate: { gte: new Date() },
  };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    where.categories = { some: { category: { slug: params.category } } };
  }

  const [total, events, categories] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: {
        organization: { select: { name: true } },
        categories: { include: { category: true } },
        _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
      },
      orderBy: { startDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    if (nextPage > 1) query.set("page", String(nextPage));
    const value = query.toString();
    return value ? `/events?${value}` : "/events";
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.events.title}</h1>
          <form className="flex items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder={t.events.searchPlaceholder}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {t.events.search}
            </button>
          </form>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/events"
            className={`rounded-full border px-3 py-1 text-sm ${
              !params.category
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.events.allCategories}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/events?category=${cat.slug}`}
              className={`rounded-full border px-3 py-1 text-sm ${
                params.category === cat.slug
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500">{t.events.noResults}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
              >
                <EventCover url={event.coverImageUrl} label={t.eventDetail.photo} className="h-44 w-full" />
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
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                    {event.shortDescription || event.description.slice(0, 120)}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {event.categories.slice(0, 2).map((ec) => (
                        <span
                          key={ec.categoryId}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
                        >
                          {ec.category.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {Math.max(event.capacity - event._count.registrations, 0)} {t.events.spots}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatKzt(event.price, t.events.free)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="text-sm font-medium text-gray-700 hover:text-gray-900">
                {t.events.prev}
              </Link>
            ) : (
              <span className="text-sm text-gray-300">{t.events.prev}</span>
            )}
            <span className="text-sm text-gray-500">
              {tReplace(t.events.page, { page, pages })}
            </span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className="text-sm font-medium text-gray-700 hover:text-gray-900">
                {t.events.next}
              </Link>
            ) : (
              <span className="text-sm text-gray-300">{t.events.next}</span>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
