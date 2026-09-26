"use client";

import { useTransition, useState } from "react";
import { publishEvent, cancelEvent, deleteEvent } from "@/actions/events";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";

export function EventActions({
  eventId,
  status,
  slug,
}: {
  eventId: string;
  status: string;
  slug: string;
}) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAction = (action: (id: string) => Promise<{ error: string } | void | undefined>) => {
    startTransition(async () => {
      setError(null);
      const result = await action(eventId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Link
          href={`/events/${slug}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          target="_blank"
        >
          {t.dashboard.preview}
        </Link>
        {status === "DRAFT" && (
          <button
            onClick={() => handleAction(publishEvent)}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {t.dashboard.publish}
          </button>
        )}
        {(status === "DRAFT" || status === "PUBLISHED") && (
          <button
            onClick={() => handleAction(cancelEvent)}
            disabled={isPending}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {t.dashboard.cancel}
          </button>
        )}
        {status === "DRAFT" && (
          <button
            onClick={() => {
              if (confirm(t.dashboard.deleteConfirm)) {
                handleAction(deleteEvent);
              }
            }}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {t.dashboard.delete}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
