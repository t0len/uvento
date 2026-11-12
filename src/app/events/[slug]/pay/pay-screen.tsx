"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startStripeCheckout } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";
import { localeDate } from "@/lib/i18n/config";
import { formatEventTime } from "@/lib/format";

export function PayScreen({
  registrationId,
  reservedUntil,
  cancelled,
}: {
  registrationId: string;
  reservedUntil: string | null;
  cancelled: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heldUntil = reservedUntil
    ? formatEventTime(new Date(reservedUntil), localeDate[locale])
    : "";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
        {t.myTickets.payHint}
      </h1>
      {heldUntil ? (
        <p className="mt-6 text-lg text-gray-600">
          {t.eventDetail.reservedUntil.replace("{time}", heldUntil)}
        </p>
      ) : null}
      {cancelled ? <p className="mt-4 max-w-md text-sm text-gray-600">{t.myTickets.paymentCancelled}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const result = await startStripeCheckout(registrationId);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            if (result.url.startsWith("/")) router.push(result.url);
            else window.location.assign(result.url);
          });
        }}
        className="mt-10 rounded-lg bg-gray-900 px-10 py-4 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? t.common.loading : t.myTickets.payNow}
      </button>
    </main>
  );
}
