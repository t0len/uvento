"use client";

import { useState, useTransition } from "react";
import { blockDocumentUrl } from "@/actions/blacklist";
import { useI18n } from "@/components/i18n/i18n-provider";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { localeDate } from "@/lib/i18n/config";
import type { BlockHistoryEntry } from "@/lib/block-reason";

function fill(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function DocumentButton({ entryId, name }: { entryId: string; name: string }) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await blockDocumentUrl(entryId);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            window.open(result.url, "_blank", "noopener,noreferrer");
          });
        }}
        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
      >
        <span className="truncate">{pending ? t.common.loading : name}</span>
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function BlockHistory({ entries }: { entries: BlockHistoryEntry[] }) {
  const { locale, t } = useI18n();
  const dateLocale = localeDate[locale];

  if (entries.length === 0) return null;

  return (
    <ol>
      {entries.map((entry, index) => {
        const at = new Date(entry.createdAt);
        const blocked = entry.action === "BLOCK";
        return (
          <li key={entry.id} className="relative pb-5 pl-6 last:pb-0">
            {index < entries.length - 1 ? (
              <span className="absolute bottom-0 left-[6px] top-4 w-px bg-gray-200" />
            ) : null}
            <span
              className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white ${
                blocked ? "border-red-500" : "border-gray-400"
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  blocked ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                }`}
              >
                {blocked ? t.blacklist.blocked : t.blacklist.unblocked}
              </span>
              <time className="text-xs text-gray-500">
                {formatEventDate(at, dateLocale, { month: "short", day: "numeric", year: "numeric" })}{" "}
                {formatEventTime(at, dateLocale)}
              </time>
            </div>
            {entry.actorName ? (
              <p className="mt-1 text-xs text-gray-500">{fill(t.blacklist.by, { name: entry.actorName })}</p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{entry.reason}</p>
            {entry.documentName ? <DocumentButton entryId={entry.id} name={entry.documentName} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
