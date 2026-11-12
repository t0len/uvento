import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { getI18n } from "@/lib/i18n";
import { categoryLabel } from "@/lib/categories";
import { occupiedSeatsByEvent } from "@/lib/seats";
import { releaseExpiredReservations } from "@/lib/reservations";
import { EventCatalog, type CatalogEvent } from "./event-catalog";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { locale, t } = await getI18n();
  await releaseExpiredReservations();

  const [events, categories] = await Promise.all([
    prisma.event.findMany({
      where: { status: "PUBLISHED", endDate: { gte: new Date() } },
      include: {
        categories: { include: { category: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const seats = await occupiedSeatsByEvent(events.map((event) => event.id));
  const catalog: CatalogEvent[] = events.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    shortDescription: event.shortDescription,
    coverImageUrl: event.coverImageUrl,
    location: event.location,
    startDate: event.startDate?.toISOString() ?? null,
    price: event.price,
    participationType: event.participationType,
    spotsLeft:
      event.capacity == null ? null : Math.max(event.capacity - (seats.get(event.id) ?? 0), 0),
    categories: event.categories.map((item) => ({
      slug: item.category.slug,
      label: categoryLabel(t, item.category),
    })),
  }));
  const categoryFilters = categories
    .map((cat) => ({ slug: cat.slug, label: categoryLabel(t, cat) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <EventCatalog
        events={catalog}
        categories={categoryFilters}
        locale={locale === "en" ? "en-US" : locale === "kk" ? "kk-KZ" : "ru-RU"}
        initialQuery={params.q ?? ""}
        initialCategory={params.category ?? ""}
        initialPage={Math.max(1, Number(params.page) || 1)}
        labels={{
          title: t.events.title,
          searchPlaceholder: t.events.searchPlaceholder,
          search: t.events.search,
          allCategories: t.events.allCategories,
          noResults: t.events.noResults,
          noUpcoming: t.events.noUpcoming,
          openEvent: t.events.openEvent,
          freeEvent: t.events.freeEvent,
          paidEvent: t.events.paidEvent,
          free: t.events.free,
          prev: t.events.prev,
          next: t.events.next,
          page: t.events.page,
          spots: t.events.spots,
          photo: t.eventDetail.photo,
        }}
      />
    </div>
  );
}
