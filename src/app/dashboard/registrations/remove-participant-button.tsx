"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelRegistration, restoreRegistration } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";

export function RemoveParticipantButton({ registrationId }: { registrationId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(t.dashboard.removeParticipantConfirm)) return;
          setError(null);
          startTransition(async () => {
            const res = await cancelRegistration(registrationId);
            if (res?.error) setError(res.error);
            if (res?.success) router.refresh();
          });
        }}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? "…" : t.dashboard.removeParticipant}
      </button>
      {error ? <span className="max-w-48 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

export function RestoreParticipantButton({ registrationId }: { registrationId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await restoreRegistration(registrationId);
            if (res?.error) setError(res.error);
            if (res?.success) router.refresh();
          });
        }}
        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending ? "…" : t.dashboard.restoreParticipant}
      </button>
      {error ? <span className="max-w-48 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
