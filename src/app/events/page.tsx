import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { getI18n, localeDate } from "@/lib/i18n";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const { locale, t } = await getI18n();

  const where: Record<string, unknown> = { status: "PUBLISHED" };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    where.categories = { some: { category: { slug: params.category } } };
  }

  const [events, categories] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        organization: { select: { name: true } },
        categories: { include: { category: true } },
        _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

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
                        {event._count.registrations}/{event.capacity}
                      </span>
                      {event.price > 0 ? (
                        <span className="text-sm font-medium text-gray-900">
                          {event.price} KZT
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {t.events.free}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
