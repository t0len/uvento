"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EventCover } from "@/components/events/event-cover";
import { formatEventDate, formatEventTime, formatKzt } from "@/lib/format";

const PAGE_SIZE = 9;

function foldSearch(value: string) {
  return value.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
}

export type CatalogEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  location: string;
  startDate: string | null;
  price: number;
  participationType: "OPEN" | "FREE" | "PAID";
  spotsLeft: number | null;
  categories: { slug: string; label: string }[];
};

type CatalogLabels = {
  title: string;
  searchPlaceholder: string;
  search: string;
  allCategories: string;
  noResults: string;
  noUpcoming: string;
  openEvent: string;
  freeEvent: string;
  paidEvent: string;
  free: string;
  prev: string;
  next: string;
  page: string;
  spots: string;
  photo: string;
};

export function EventCatalog({
  events,
  categories,
  locale,
  labels,
  initialQuery = "",
  initialCategory = "",
  initialPage = 1,
}: {
  events: CatalogEvent[];
  categories: { slug: string; label: string }[];
  locale: string;
  labels: CatalogLabels;
  initialQuery?: string;
  initialCategory?: string;
  initialPage?: number;
}) {
  const [draft, setDraft] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);

  const filtered = useMemo(() => {
    const needle = foldSearch(draft);
    return events.filter((event) => {
      if (category && !event.categories.some((item) => item.slug === category)) return false;
      if (!needle) return true;
      const haystack = foldSearch(
        [event.title, event.shortDescription ?? "", event.description].join(" "),
      );
      return haystack.includes(needle);
    });
  }, [events, category, draft]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function selectCategory(slug: string) {
    setCategory(slug);
    setPage(1);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
        <form
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            type="text"
            name="q"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setPage(1);
            }}
            placeholder={labels.searchPlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-gray-500 sm:w-64 sm:flex-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {labels.search}
          </button>
        </form>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectCategory("")}
          className={`rounded-full border px-3 py-1 text-sm ${
            !category
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
        >
          {labels.allCategories}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => selectCategory(cat.slug)}
            className={`rounded-full border px-3 py-1 text-sm active:scale-[0.98] ${
              category === cat.slug
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-500">
            {events.length === 0 ? labels.noUpcoming : labels.noResults}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((event) => {
            const start = event.startDate ? new Date(event.startDate) : null;
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
              >
                <EventCover url={event.coverImageUrl} label={labels.photo} className="h-44 w-full" />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>
                      {formatEventDate(start, locale)}
                      {start ? ` · ${formatEventTime(start, locale)}` : ""}
                    </span>
                    <span>{event.location}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                    {event.shortDescription || event.description.slice(0, 120)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {event.categories.slice(0, 2).map((item) => (
                        <span
                          key={item.slug}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      {event.spotsLeft != null ? (
                        <span className="text-xs text-gray-400">
                          {event.spotsLeft} {labels.spots}
                        </span>
                      ) : null}
                      <span className="text-xs text-gray-500">
                        {event.participationType === "OPEN"
                          ? labels.openEvent
                          : event.participationType === "PAID"
                            ? labels.paidEvent
                            : labels.freeEvent}
                      </span>
                      {event.participationType === "PAID" ? (
                        <span className="text-sm font-medium text-gray-900">
                          {formatKzt(event.price, labels.free, locale)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {safePage > 1 ? (
            <button
              type="button"
              onClick={() => setPage(safePage - 1)}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {labels.prev}
            </button>
          ) : (
            <span className="text-sm text-gray-300">{labels.prev}</span>
          )}
          <span className="text-sm text-gray-500">
            {labels.page.replaceAll("{page}", String(safePage)).replaceAll("{pages}", String(pages))}
          </span>
          {safePage < pages ? (
            <button
              type="button"
              onClick={() => setPage(safePage + 1)}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {labels.next}
            </button>
          ) : (
            <span className="text-sm text-gray-300">{labels.next}</span>
          )}
        </div>
      )}
    </main>
  );
}
