"use client";

import { useState, useTransition, type ReactNode } from "react";
import { registerForEvent, cancelRegistration } from "@/actions/registrations";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { formatKzt } from "@/lib/format";

export function RegisterButton({
  eventId,
  price,
  isLoggedIn,
  existingStatus,
  registrationId,
  isCancelled,
  isPast,
  isFull,
}: {
  eventId: string;
  price: number;
  isLoggedIn: boolean;
  existingStatus: string | null;
  registrationId: string | null;
  isCancelled: boolean;
  isPast: boolean;
  isFull: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(existingStatus);
  const [currentRegistrationId, setCurrentRegistrationId] = useState(registrationId);
  const { t } = useI18n();
  const priceLabel = formatKzt(price, t.common.free);

  const ticketRow = (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">{t.eventDetail.standardTicket}</p>
          <p className="mt-1 text-sm text-gray-500">{t.eventDetail.ticketAccess}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-900">{priceLabel}</span>
          <div className="flex items-center rounded-lg border border-gray-200">
            <button
              type="button"
              disabled
              title={t.eventDetail.onePerPerson}
              className="px-3 py-1.5 text-gray-300"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm text-gray-900">1</span>
            <button
              type="button"
              disabled
              title={t.eventDetail.onePerPerson}
              className="px-3 py-1.5 text-gray-300"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">{t.eventDetail.onePerPerson}</p>
    </div>
  );

  let action: ReactNode;

  if (!isLoggedIn) {
    action = (
      <Link
        href="/login"
        className="mt-4 flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
      >
        {t.eventDetail.book}
      </Link>
    );
  } else if (isCancelled || isPast) {
    action = (
      <button
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-lg bg-gray-300 px-6 py-3 text-sm font-medium text-gray-500"
      >
        {isCancelled ? t.status.CANCELLED : t.status.COMPLETED}
      </button>
    );
  } else if (status === "CONFIRMED" || status === "PENDING" || status === "CHECKED_IN") {
    action = (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {status === "PENDING"
            ? t.events.pendingPayment
            : status === "CHECKED_IN"
              ? t.status.CHECKED_IN
              : t.events.registered}
        </span>
        {status !== "CHECKED_IN" && currentRegistrationId && (
          <button
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const res = await cancelRegistration(currentRegistrationId);
                if (res?.error) setError(res.error);
                else setStatus("CANCELLED");
              });
            }}
            disabled={isPending}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {t.events.cancelRegistration}
          </button>
        )}
      </div>
    );
  } else {
    action = (
      <button
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const res = await registerForEvent(eventId);
            if (res?.error) setError(res.error);
            else if (res?.success) {
              setStatus(res.status);
              setCurrentRegistrationId(res.registrationId);
            }
          });
        }}
        disabled={isPending || isFull}
        className="mt-4 w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
      >
        {isPending ? t.common.loading : isFull ? t.eventDetail.soldOut : t.eventDetail.book}
      </button>
    );
  }

  return (
    <div>
      {ticketRow}
      {action}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
