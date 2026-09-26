"use client";

import { useState, useTransition } from "react";
import { registerForEvent, cancelRegistration } from "@/actions/registrations";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";

export function RegisterButton({
  eventId,
  isLoggedIn,
  existingStatus,
  isCancelled,
  isPast,
  isFull,
}: {
  eventId: string;
  isLoggedIn: boolean;
  existingStatus: string | null;
  isCancelled: boolean;
  isPast: boolean;
  isFull: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(existingStatus);
  const { t } = useI18n();

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
      >
        {t.events.loginToRegister}
      </Link>
    );
  }

  if (isCancelled || isPast) {
    return (
      <button
        disabled
        className="inline-flex cursor-not-allowed rounded-lg bg-gray-300 px-6 py-3 text-sm font-medium text-gray-500"
      >
        {isCancelled ? t.status.CANCELLED : t.status.COMPLETED}
      </button>
    );
  }

  if (status === "CONFIRMED" || status === "PENDING") {
    return (
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {status === "CONFIRMED" ? t.events.registered : t.events.pendingPayment}
        </span>
        <button
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const res = await cancelRegistration(eventId);
              if (res?.error) setError(res.error);
              else setStatus("CANCELLED");
            });
          }}
          disabled={isPending}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {t.events.cancelRegistration}
        </button>
      </div>
    );
  }

  if (status === "CHECKED_IN") {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
        {t.status.CHECKED_IN}
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const res = await registerForEvent(eventId);
            if (res?.error) setError(res.error);
            else if (res?.success) setStatus("CONFIRMED");
          });
        }}
        disabled={isPending || isFull}
        className="inline-flex rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
      >
        {isPending ? t.common.loading : isFull ? "…" : t.events.register}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
