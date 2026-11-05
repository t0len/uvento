"use client";

import { useState, useTransition, type ReactNode } from "react";
import { registerForEvent, cancelRegistration } from "@/actions/registrations";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { countTickets, formatKzt } from "@/lib/format";
import { MAX_TICKETS_PER_ORDER } from "@/lib/tickets";
import { StripePayButton } from "./stripe-pay-button";

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
  reservedUntil,
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
  reservedUntil: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(existingStatus);
  const [currentRegistrationId, setCurrentRegistrationId] = useState(registrationId);
  const [heldUntil, setHeldUntil] = useState(reservedUntil);
  const { locale, t } = useI18n();
  const booked =
    status === "CONFIRMED" || status === "PENDING" || status === "CHECKED_IN";
  const room = spotsLeft == null ? MAX_TICKETS_PER_ORDER : Math.max(spotsLeft, 0);
  const max = booked ? Math.max(existingQuantity, 1) : Math.min(MAX_TICKETS_PER_ORDER, room);
  const [quantity, setQuantity] = useState(booked ? Math.max(existingQuantity, 1) : 1);
  const totalLabel = formatKzt(price * quantity, t.common.free, locale);
  const canAdd = !booked && quantity < max;
  const canRemove = !booked && quantity > 1;

  const ticketRow = (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">{t.eventDetail.standardTicket}</p>
          <p className="mt-1 text-sm text-gray-500">{t.eventDetail.ticketAccess}</p>
          {price > 0 && quantity > 1 ? (
            <p className="mt-1 text-xs text-gray-400">
              {formatKzt(price, t.common.free, locale)} × {quantity}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tabular-nums text-gray-900">{totalLabel}</span>
          {participationType !== "OPEN" && !booked ? (
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
          ) : quantity > 1 ? (
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800">
              {countTickets(quantity, locale)}
            </span>
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
            const res = await registerForEvent(eventId, quantity);
            if (res?.error) setError(res.error);
            else if (res?.success) {
              setStatus(res.status);
              setCurrentRegistrationId(res.registrationId);
              setHeldUntil(res.reservedUntil);
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
      {status === "PENDING" && currentRegistrationId ? (
        <StripePayButton registrationId={currentRegistrationId} reservedUntil={heldUntil} />
      ) : null}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
