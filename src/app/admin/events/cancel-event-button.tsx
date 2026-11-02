"use client";

import { useState, useTransition } from "react";
import { adminCancelEvent } from "@/actions/admin";
import { useI18n } from "@/components/i18n/i18n-provider";

export function CancelEventButton({ eventId }: { eventId: string }) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(t.dashboard.deleteConfirm)) return;
        setError(null);
        startTransition(async () => {
          const result = await adminCancelEvent(eventId);
          if (result?.error) setError(result.error);
        });
      }}
      className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "…" : t.admin.cancel}
    </button>
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
