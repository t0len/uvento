"use client";

import { useEffect } from "react";
import { EventCover } from "@/components/events/event-cover";
import { useI18n } from "@/components/i18n/i18n-provider";
import { categoryLabel } from "@/lib/categories";
import { formatEventDate, formatEventTime, formatKzt } from "@/lib/format";
import { localeDate } from "@/lib/i18n/config";
import { tReplace } from "@/lib/i18n/dictionaries";

export type EventPreviewData = {
  title: string;
  description: string;
  location: string;
  venue: string;
  start: Date | null;
  end: Date | null;
  capacity: number | null;
  price: number;
  participationType: "OPEN" | "FREE" | "PAID";
  categories: { name: string; slug: string }[];
  cover: string | null;
  organizationName: string;
  hasTime: boolean;
};

export function EventPreview({
  event,
  published = false,
  onClose,
}: {
  event: EventPreviewData;
  published?: boolean;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const dateLocale = localeDate[locale];

  useEffect(() => {
    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const startLabel = formatEventDate(event.start, dateLocale);
  const endLabel = formatEventDate(event.end, dateLocale);
  const dateLabel = startLabel && endLabel && startLabel !== endLabel ? `${startLabel} – ${endLabel}` : startLabel;
  const timeLabel =
    event.hasTime && event.start && event.end
      ? `${formatEventTime(event.start, dateLocale)} – ${formatEventTime(event.end, dateLocale)}`
      : "";
  const spots =
    event.participationType === "OPEN"
      ? t.events.openEvent
      : event.capacity != null
        ? `${event.capacity} ${t.events.spots}`
        : "";
  const priceNote =
    event.participationType === "PAID"
      ? formatKzt(event.price, t.common.free, locale)
      : event.participationType === "FREE"
        ? t.events.freeEvent
        : "";
  const meta = [spots, priceNote].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{t.dashboard.preview}</p>
            <p className="truncate text-xs text-gray-500">
              {published ? t.dashboard.previewNoteLive : t.dashboard.previewNote}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {t.common.back}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <EventCover url={event.cover} label={t.eventDetail.photo} className="aspect-[16/10] w-full rounded-xl" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              {dateLabel ? (
                <p>
                  {dateLabel}
                  {timeLabel ? (
                    <>
                      <span className="mx-2 text-gray-300">·</span>
                      {timeLabel}
                    </>
                  ) : null}
                </p>
              ) : null}
              {event.location ? (
                <p>
                  {event.location}
                  {event.venue ? `, ${event.venue}` : ""}
                </p>
              ) : null}
              {event.organizationName ? (
                <p>{tReplace(t.eventDetail.organizer, { name: event.organizationName })}</p>
              ) : null}
            </div>
            {event.categories.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {event.categories.map((category) => (
                  <span
                    key={category.slug}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                  >
                    {categoryLabel(t, category)}
                  </span>
                ))}
              </div>
            ) : null}
            {meta ? <p className="mt-4 text-xs text-gray-400">{meta}</p> : null}
          </div>
        </div>

        {event.description ? (
          <section className="mt-10 border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">{t.eventDetail.about}</h2>
            <div className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {event.description}
            </div>
          </section>
        ) : null}

        {event.participationType !== "OPEN" ? (
          <section className="mt-8 max-w-xl">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-lg font-semibold tabular-nums text-gray-900">
                {formatKzt(event.participationType === "PAID" ? event.price : 0, t.common.free, locale)}
              </p>
            </div>
            <button
              type="button"
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-lg bg-gray-300 px-6 py-3 text-sm font-medium text-gray-500"
            >
              {event.participationType === "FREE" ? t.eventDetail.bookFree : t.eventDetail.book}
            </button>
          </section>
        ) : (
          <p className="mt-8 text-sm text-gray-600">{t.events.openEvent}</p>
        )}
      </div>
    </div>
  );
}
