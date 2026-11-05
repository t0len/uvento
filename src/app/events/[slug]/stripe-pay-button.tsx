"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startStripeCheckout } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";
import { formatEventTime } from "@/lib/format";

export function StripePayButton({
  registrationId,
  reservedUntil,
}: {
  registrationId: string;
  reservedUntil: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heldUntil = reservedUntil
    ? formatEventTime(new Date(reservedUntil), locale === "en" ? "en-US" : locale === "kk" ? "kk-KZ" : "ru-KZ")
    : "";

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">{t.myTickets.payTitle}</p>
      <p className="text-xs text-gray-500">{t.myTickets.payHint}</p>
      {heldUntil ? (
        <p className="text-xs text-gray-500">{t.eventDetail.reservedUntil.replace("{time}", heldUntil)}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? t.common.loading : t.myTickets.paySubmit}
      </button>
    </div>
  );
}
