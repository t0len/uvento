"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addTickets, cancelRegistration, registerForEvent } from "@/actions/registrations";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { countTickets, formatKzt } from "@/lib/format";
import { MAX_TICKETS_PER_ORDER } from "@/lib/tickets";

export function RegisterButton({
  eventId,
  price,
  isLoggedIn,
  existingStatus,
  registrationId,
  isCancelled,
  isPast,
  isFull,
  spotsLeft,
  existingQuantity,
  participationType,
  slug,
  hasPendingPayment,
}: {
  eventId: string;
  price: number;
  isLoggedIn: boolean;
  existingStatus: string | null;
  registrationId: string | null;
  isCancelled: boolean;
  isPast: boolean;
  isFull: boolean;
  spotsLeft: number | null;
  existingQuantity: number;
  participationType: "OPEN" | "FREE" | "PAID";
  slug: string;
  hasPendingPayment: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(existingStatus);
  const [currentRegistrationId, setCurrentRegistrationId] = useState(registrationId);
  const [pendingPayment, setPendingPayment] = useState(hasPendingPayment);
  const [owned, setOwned] = useState(existingQuantity);
  const { locale, t } = useI18n();
  const booked = status === "CONFIRMED" || status === "PENDING" || status === "CHECKED_IN";
  const buyingMore = status === "CONFIRMED" || status === "CHECKED_IN";
  const room = spotsLeft == null ? MAX_TICKETS_PER_ORDER : Math.max(spotsLeft, 0);
  const max = Math.min(MAX_TICKETS_PER_ORDER, room);
  const [quantity, setQuantity] = useState(1);
  const showStepper = participationType !== "OPEN" && !isPast && !isCancelled && (!booked || (buyingMore && !pendingPayment && max > 0));
  const totalLabel = formatKzt(price * (showStepper ? quantity : booked ? owned : quantity), t.common.free, locale);
  const canAdd = showStepper && quantity < max;
  const canRemove = showStepper && quantity > 1;

  const ticketRow = (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">{t.eventDetail.standardTicket}</p>
          <p className="mt-1 text-sm text-gray-500">{t.eventDetail.ticketAccess}</p>
          {booked && owned > 0 ? (
            <p className="mt-1 text-xs text-gray-400">{countTickets(owned, locale)}</p>
          ) : null}
          {price > 0 && showStepper && quantity > 1 ? (
            <p className="mt-1 text-xs text-gray-400">
              {formatKzt(price, t.common.free, locale)} × {quantity}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tabular-nums text-gray-900">{totalLabel}</span>
          {showStepper ? (
            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                aria-label={t.eventDetail.removeTicket}
                disabled={!canRemove}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="px-3 py-2 text-base leading-none text-gray-800 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm font-medium tabular-nums text-gray-900">{quantity}</span>
              <button
                type="button"
                aria-label={t.eventDetail.addTicket}
                disabled={!canAdd}
                onClick={() => setQuantity((current) => Math.min(max, current + 1))}
                className="px-3 py-2 text-base leading-none text-gray-900 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                +
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  let action: ReactNode;

  if (participationType === "OPEN") {
    action = <p className="mt-4 text-sm text-gray-600">{t.events.openEvent}</p>;
  } else if (!isLoggedIn) {
    action = (
      <Link
        href="/login"
        className="mt-4 flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 active:bg-gray-950"
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
  } else if (buyingMore && !pendingPayment && max > 0) {
    action = (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const res = await addTickets(eventId, quantity);
              if (res?.error) setError(res.error);
              else if (res?.success) {
                if (res.status === "PENDING") {
                  setPendingPayment(true);
                  router.push(`/events/${slug}/pay`);
                } else {
                  setOwned(res.quantity ?? owned + quantity);
                  setQuantity(1);
                  router.refresh();
                }
              }
            });
          }}
          disabled={isPending}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t.common.loading : t.eventDetail.buyMore}
        </button>
        {status !== "CHECKED_IN" && currentRegistrationId ? (
          <button
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const res = await cancelRegistration(currentRegistrationId);
                if (res?.error) setError(res.error);
                else {
                  setStatus("CANCELLED");
                  setPendingPayment(false);
                }
              });
            }}
            disabled={isPending}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {t.events.cancelRegistration}
          </button>
        ) : null}
      </div>
    );
  } else if (booked) {
    action = (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {status === "PENDING" || pendingPayment
            ? t.events.pendingPayment
            : status === "CHECKED_IN"
              ? t.status.CHECKED_IN
              : t.events.registered}
        </span>
        {status !== "CHECKED_IN" && currentRegistrationId && !pendingPayment ? (
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
        ) : null}
      </div>
    );
  } else {
    action = (
      <button
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const res = await registerForEvent(eventId, quantity);
            if (res?.error) setError(res.error);
            else if (res?.success) {
              setStatus(res.status);
              setCurrentRegistrationId(res.registrationId);
              setOwned(res.quantity ?? quantity);
              setQuantity(1);
              if (res.status === "PENDING") {
                setPendingPayment(true);
                router.push(`/events/${slug}/pay`);
              } else {
                router.refresh();
              }
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
      {(status === "PENDING" || pendingPayment) && currentRegistrationId ? (
        <Link
          href={`/events/${slug}/pay`}
          className="mt-4 inline-flex text-sm font-medium text-gray-900 underline"
        >
          {t.myTickets.paySubmit}
        </Link>
      ) : null}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
