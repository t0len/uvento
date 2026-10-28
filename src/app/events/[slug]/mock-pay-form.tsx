"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeMockPayment } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";
import { formatEventTime } from "@/lib/format";

export function MockPayForm({
  registrationId,
  reservedUntil,
  onPaid,
}: {
  registrationId: string;
  reservedUntil: string | null;
  onPaid?: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heldUntil = reservedUntil
    ? formatEventTime(new Date(reservedUntil), locale === "en" ? "en-US" : locale === "kk" ? "kk-KZ" : "ru-KZ")
    : "";

  return (
    <form
      className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          setError(null);
          const result = await completeMockPayment(registrationId, formData);
          if (result.error) setError(result.error);
          else {
            onPaid?.();
            router.refresh();
          }
        });
      }}
    >
      <p className="text-sm font-medium text-gray-900">{t.myTickets.payTitle}</p>
      <p className="text-xs text-gray-500">{t.myTickets.payHint}</p>
      {heldUntil ? (
        <p className="text-xs text-gray-500">{t.eventDetail.reservedUntil.replace("{time}", heldUntil)}</p>
      ) : null}
      <label className="block text-sm text-gray-700">
        {t.myTickets.cardNumber}
        <input
          name="card"
          inputMode="numeric"
          autoComplete="off"
          placeholder="4242424242424242"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-gray-700">
          {t.myTickets.cardExpiry}
          <input
            name="expiry"
            autoComplete="off"
            placeholder="12/30"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </label>
        <label className="block text-sm text-gray-700">
          {t.myTickets.cardCvv}
          <input
            name="cvv"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </label>
      </div>
      <label className="block text-sm text-gray-700">
        {t.myTickets.cardHolder}
        <input
          name="holder"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? t.common.loading : t.myTickets.paySubmit}
      </button>
    </form>
  );
}
