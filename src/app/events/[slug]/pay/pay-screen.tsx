"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startStripeCheckout } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";
import { localeDate } from "@/lib/i18n/config";
import { countTickets, formatEventTime, formatKzt } from "@/lib/format";
import { ActionError } from "@/components/blacklist/action-error";

export function PayScreen({
  registrationId,
  paymentId,
  reservedUntil,
  cancelled,
  quantity,
  amount,
  unitPrice,
}: {
  registrationId: string;
  paymentId: string;
  reservedUntil: string | null;
  cancelled: boolean;
  quantity: number;
  amount: number;
  unitPrice: number;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errorHref, setErrorHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heldUntil = reservedUntil
    ? formatEventTime(new Date(reservedUntil), localeDate[locale])
    : "";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
        {t.myTickets.payHint}
      </h1>
      <p className="mt-6 text-3xl font-semibold tabular-nums text-gray-900">
        {formatKzt(amount, t.common.free, locale)}
      </p>
      {quantity > 1 ? (
        <p className="mt-2 text-sm text-gray-500">
          {countTickets(quantity, locale)} · {formatKzt(unitPrice, t.common.free, locale)} × {quantity}
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-500">{countTickets(quantity, locale)}</p>
      )}
      {heldUntil ? (
        <p className="mt-6 text-lg text-gray-600">
          {t.eventDetail.reservedUntil.replace("{time}", heldUntil)}
        </p>
      ) : null}
      {cancelled ? <p className="mt-4 max-w-md text-sm text-gray-600">{t.myTickets.paymentCancelled}</p> : null}
      {error ? (
        <div className="mt-4">
          <ActionError message={error} href={errorHref} linkLabel={t.blacklist.seeHistory} />
        </div>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            setErrorHref(null);
            const result = await startStripeCheckout(registrationId, paymentId);
            if ("error" in result) {
              setError(result.error);
              setErrorHref(result.href ?? null);
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
