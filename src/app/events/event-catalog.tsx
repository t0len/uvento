"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EventCover } from "@/components/events/event-cover";
import { EVENT_TIME_ZONE, dateTimeParts, formatEventDate, formatEventTime, formatKzt } from "@/lib/format";

const PAGE_SIZE = 9;

function foldSearch(value: string) {
  return value.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
}

function dayKey(iso: string | null) {
  if (!iso) return "";
  return dateTimeParts(new Date(iso)).date;
}

function shiftDay(day: string, amount: number) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + amount));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function coversDay(event: CatalogEvent, day: string) {
  const start = dayKey(event.startDate);
  const end = dayKey(event.endDate) || start;
  if (!start || !end) return false;
  const from = start < end ? start : end;
  const to = start > end ? start : end;
  return from <= day && day <= to;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function dayLabel(day: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { timeZone: EVENT_TIME_ZONE, ...options }).format(
    new Date(`${day}T12:00:00+05:00`),
  );
}

function buildDateStrip(events: CatalogEvent[], today: string, locale: string) {
  const horizon = shiftDay(today, 200);
  const busy = new Set<string>();
  let last = today;
  for (const event of events) {
    const start = dayKey(event.startDate);
    const end = dayKey(event.endDate) || start;
    if (!start || !end) continue;
    const from = (start < end ? start : end) < today ? today : start < end ? start : end;
    const to = (start > end ? start : end) > horizon ? horizon : start > end ? start : end;
    if (to < today || from > to) continue;
    if (to > last) last = to;
    let guard = 0;
    for (let cursor = from; cursor <= to && guard < 200; cursor = shiftDay(cursor, 1)) {
      busy.add(cursor);
      guard += 1;
      if (cursor === to) break;
    }
  }

  const months: {
    key: string;
    label: string;
    days: { date: string; number: string; weekday: string; busy: boolean }[];
  }[] = [];
  for (let cursor = today; cursor <= last; cursor = shiftDay(cursor, 1)) {
    const key = cursor.slice(0, 7);
    const day = {
      date: cursor,
      number: String(Number(cursor.slice(8, 10))),
      weekday: capitalize(dayLabel(cursor, locale, { weekday: "short" }).replace(".", "")),
      busy: busy.has(cursor),
    };
    const current = months[months.length - 1];
    if (!current || current.key !== key) {
      months.push({ key, label: capitalize(dayLabel(cursor, locale, { month: "long" })), days: [day] });
    } else {
      current.days.push(day);
    }
    if (cursor === last) break;
  }
  return months;
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
  endDate: string | null;
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
  allDates: string;
  noResults: string;
  noUpcoming: string;
  openEvent: string;
  freeEvent: string;
  paidEvent: string;
  kindOpen: string;
  kindFree: string;
  kindPaid: string;
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
  initialDate = "",
  initialPage = 1,
}: {
  events: CatalogEvent[];
  categories: { slug: string; label: string }[];
  locale: string;
  labels: CatalogLabels;
  initialQuery?: string;
  initialCategory?: string;
  initialDate?: string;
  initialPage?: number;
}) {
  const pathname = usePathname();
  const stripRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [day, setDay] = useState(initialDate);
  const [page, setPage] = useState(initialPage);
  const today = useMemo(() => dateTimeParts(new Date()).date, []);

  function writeUrl(next: { q: string; category: string; date: string; page: number }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.category) params.set("category", next.category);
    if (next.date) params.set("date", next.date);
    if (next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    window.history.replaceState(window.history.state, "", href);
  }

  const months = useMemo(() => buildDateStrip(events, today, locale), [events, today, locale]);
  const knownDays = useMemo(() => new Set(months.flatMap((month) => month.days.map((item) => item.date))), [months]);
  const selected = knownDays.has(day) ? day : "";

  const filtered = useMemo(() => {
    const needle = foldSearch(draft);
    return events.filter((event) => {
      if (category && !event.categories.some((item) => item.slug === category)) return false;
      if (selected && !coversDay(event, selected)) return false;
      if (!needle) return true;
      const haystack = foldSearch(
        [event.title, event.shortDescription ?? "", event.description].join(" "),
      );
      return haystack.includes(needle);
    });
  }, [events, category, draft, selected]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function selectCategory(slug: string) {
    setCategory(slug);
    setPage(1);
    writeUrl({ q: draft, category: slug, date: selected, page: 1 });
  }

  function selectDay(nextDay: string) {
    const value = selected === nextDay ? "" : nextDay;
    setDay(value);
    setPage(1);
    writeUrl({ q: draft, category, date: value, page: 1 });
  }

  useEffect(() => {
    const strip = stripRef.current;
    if (!selected || !strip) return;
    const node = strip.querySelector<HTMLElement>(`[data-day="${selected}"]`);
    if (!node) return;
    const stripBox = strip.getBoundingClientRect();
    const nodeBox = node.getBoundingClientRect();
    const delta = nodeBox.left - stripBox.left - stripBox.width / 2 + nodeBox.width / 2;
    strip.scrollTo({ left: strip.scrollLeft + delta, behavior: "smooth" });
  }, [selected]);

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
              const value = event.target.value;
              setDraft(value);
              setPage(1);
              writeUrl({ q: value, category, date: selected, page: 1 });
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

      {months.length > 0 ? (
        <div className="mb-6 flex items-end gap-3">
          <button
            type="button"
            aria-pressed={!selected}
            onClick={() => selectDay("")}
            className={`mb-3 inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
              !selected
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {labels.allDates}
          </button>
          <div ref={stripRef} className="flex min-w-0 flex-1 gap-5 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {months.map((month) => (
              <div key={month.key} className="shrink-0">
                <p className="sticky left-0 z-10 mb-2 w-max bg-gray-50 pr-3 text-sm font-semibold text-gray-900">
                  {month.label}
                </p>
                <div className="flex">
                  {month.days.map((item) => {
                    const active = selected === item.date;
                    return (
                      <button
                        key={item.date}
                        type="button"
                        data-day={item.date}
                        aria-pressed={active}
                        onClick={() => selectDay(item.date)}
                        className="flex w-10 flex-col items-center gap-1 rounded-lg px-0.5 py-1 hover:bg-gray-100"
                      >
                        <span className={`text-[11px] ${active ? "text-gray-900" : "text-gray-400"}`}>{item.weekday}</span>
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                            active
                              ? "bg-gray-900 font-semibold text-white"
                              : item.busy
                                ? "font-medium text-gray-900"
                                : "text-gray-300"
                          }`}
                        >
                          {item.number}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
                      <span className="rounded-full border border-gray-900 px-3 py-1 text-xs font-medium text-gray-900">
                        {event.participationType === "OPEN"
                          ? labels.kindOpen
                          : event.participationType === "FREE"
                            ? labels.kindFree
                            : labels.kindPaid}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {event.spotsLeft != null ? (
                        <span className="text-xs text-gray-400">
                          {event.spotsLeft} {labels.spots}
                        </span>
                      ) : null}
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
              onClick={() => {
                const next = safePage - 1;
                setPage(next);
                writeUrl({ q: draft, category, date: selected, page: next });
              }}
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
              onClick={() => {
                const next = safePage + 1;
                setPage(next);
                writeUrl({ q: draft, category, date: selected, page: next });
              }}
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
