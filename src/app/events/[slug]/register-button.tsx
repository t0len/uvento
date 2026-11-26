"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addTickets, cancelRegistration, registerForEvent, updatePendingTickets } from "@/actions/registrations";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { countTickets, formatKzt } from "@/lib/format";
import { HolderForm, type HolderDraft } from "./holder-form";
import { ActionError } from "@/components/blacklist/action-error";

function bookingError(res: { error?: string; href?: string; success?: boolean } | null | undefined) {
  if (!res?.error) return null;
  return { message: res.error, href: res.href ?? null };
}

function clampCount(value: number, max: number | null) {
  const whole = Number.isInteger(value) && value > 0 ? value : 1;
  if (max == null) return whole;
  return Math.min(whole, Math.max(max, 1));
}

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
  initialQuantity = 1,
  participationType,
  slug,
  hasPendingPayment,
  buyer = null,
  allowSelf = true,
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
  initialQuantity?: number;
  participationType: "OPEN" | "FREE" | "PAID";
  slug: string;
  hasPendingPayment: boolean;
  buyer?: HolderDraft | null;
  allowSelf?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errorHref, setErrorHref] = useState<string | null>(null);
  const [status, setStatus] = useState(existingStatus);
  const [currentRegistrationId, setCurrentRegistrationId] = useState(registrationId);
  const [pendingPayment, setPendingPayment] = useState(hasPendingPayment);
  const [owned, setOwned] = useState(existingQuantity);
  const { locale, t } = useI18n();
  const booked = status === "CONFIRMED" || status === "PENDING" || status === "CHECKED_IN";
  const buyingMore = status === "CONFIRMED" || status === "CHECKED_IN";
  const editingUnpaid = status === "PENDING" && participationType !== "OPEN" && !isPast && !isCancelled;
  const additionalRoom = spotsLeft == null ? null : Math.max(spotsLeft, 0);
  const max = editingUnpaid ? (additionalRoom == null ? null : owned + additionalRoom) : additionalRoom;
  const [quantity, setQuantity] = useState(() =>
    clampCount(
      existingStatus === "PENDING" ? existingQuantity : initialQuantity,
      existingStatus === "PENDING"
        ? spotsLeft == null
          ? null
          : existingQuantity + Math.max(spotsLeft, 0)
        : spotsLeft == null
          ? null
          : Math.max(spotsLeft, 0),
    ),
  );
  const [collecting, setCollecting] = useState(false);
  const hasRoom = additionalRoom == null || additionalRoom > 0;
  const freeEvent = participationType === "FREE";
  const bookLabel = freeEvent ? t.eventDetail.bookFree : t.eventDetail.book;
  const moreLabel = freeEvent ? t.eventDetail.buyMoreFree : t.eventDetail.buyMore;
  const showStepper =
    participationType !== "OPEN" &&
    !isPast &&
    !isCancelled &&
    (!booked || editingUnpaid || (buyingMore && !pendingPayment && hasRoom));
  const holderCount = editingUnpaid ? Math.max(quantity - owned, 0) : quantity;
  const totalLabel = formatKzt(price * (showStepper ? quantity : booked ? owned : quantity), t.common.free, locale);
  const canAdd = showStepper && (max == null || quantity < max);
  const canRemove = showStepper && quantity > 1;
  const ctaClass = freeEvent
    ? "rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:active:scale-100"
    : "rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] active:bg-gray-950 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:active:scale-100";

  function rememberQuantity(next: number) {
    const clamped = clampCount(next, max);
    setQuantity(clamped);
    const url = new URL(window.location.href);
    if (clamped <= 1) url.searchParams.delete("tickets");
    else url.searchParams.set("tickets", String(clamped));
    window.history.replaceState(window.history.state, "", url);
  }

  function placeNew(holders?: HolderDraft[]) {
    startTransition(async () => {
      setError(null);
      setErrorHref(null);
      const res = await registerForEvent(eventId, quantity, holders);
      const failed = bookingError(res);
      if (failed) {
        setError(failed.message);
        setErrorHref(failed.href);
      } else if (res && "success" in res && res.success) {
        setCollecting(false);
        setStatus(res.status);
        setCurrentRegistrationId(res.registrationId);
        setOwned(res.quantity ?? quantity);
        rememberQuantity(1);
        if (res.status === "PENDING") {
          setPendingPayment(true);
          router.push(`/events/${slug}/pay`);
        } else {
          router.refresh();
        }
      }
    });
  }

  function placePending(holders?: HolderDraft[]) {
    startTransition(async () => {
      setError(null);
      setErrorHref(null);
      const res = await updatePendingTickets(eventId, quantity, holders);
      const failed = bookingError(res);
      if (failed) {
        setError(failed.message);
        setErrorHref(failed.href);
      } else if (res && "success" in res && res.success) {
        setCollecting(false);
        setStatus(res.status);
        setCurrentRegistrationId(res.registrationId);
        setOwned(res.quantity ?? quantity);
        if (res.status === "PENDING") {
          setPendingPayment(true);
          router.push(`/events/${slug}/pay`);
        } else {
          rememberQuantity(1);
          router.refresh();
        }
      }
    });
  }

  function continueUnpaid() {
    if (quantity === owned) {
      router.push(`/events/${slug}/pay`);
      return;
    }
    if (quantity > owned) {
      setCollecting(true);
      return;
    }
    placePending();
  }

  function placeExtra(holders?: HolderDraft[]) {
    startTransition(async () => {
      setError(null);
      setErrorHref(null);
      const res = await addTickets(eventId, quantity, holders);
      const failed = bookingError(res);
      if (failed) {
        setError(failed.message);
        setErrorHref(failed.href);
      } else if (res && "success" in res && res.success) {
        setCollecting(false);
        if (res.status === "PENDING") {
          setPendingPayment(true);
          router.push(`/events/${slug}/pay`);
        } else {
          setOwned(res.quantity ?? owned + quantity);
          rememberQuantity(1);
          router.refresh();
        }
      }
    });
  }

  const stepper = showStepper ? (
    <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        aria-label={t.eventDetail.removeTicket}
        disabled={!canRemove}
        onClick={() => rememberQuantity(quantity - 1)}
        className="px-3.5 py-2.5 text-base leading-none text-gray-800 transition hover:bg-gray-50 active:scale-95 active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent disabled:active:scale-100"
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-gray-900">{quantity}</span>
      <button
        type="button"
        aria-label={t.eventDetail.addTicket}
        disabled={!canAdd}
        onClick={() => rememberQuantity(quantity + 1)}
        className="px-3.5 py-2.5 text-base leading-none text-gray-900 transition hover:bg-gray-50 active:scale-95 active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent disabled:active:scale-100"
      >
        +
      </button>
    </div>
  ) : null;

  const ticketRow = (
    <div
      className={
        freeEvent
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5"
          : "rounded-2xl border border-gray-200 bg-white px-4 py-3.5"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          {freeEvent ? (
            <>
              <p className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {t.common.free}
              </p>
              <p className="mt-1.5 text-sm text-emerald-950">{t.eventDetail.freeNote}</p>
            </>
          ) : (
            <p className="text-lg font-semibold tabular-nums text-gray-900">{totalLabel}</p>
          )}
          {booked && owned > 0 && !showStepper ? (
            <p className={`text-xs ${freeEvent ? "mt-1 text-emerald-800/70" : "text-gray-400"}`}>
              {countTickets(owned, locale)}
            </p>
          ) : null}
          {!freeEvent && price > 0 && showStepper && quantity > 1 ? (
            <p className="text-xs text-gray-400">
              {formatKzt(price, t.common.free, locale)} × {quantity}
            </p>
          ) : null}
        </div>
        {stepper}
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
        className={`mt-4 flex w-full items-center justify-center ${ctaClass}`}
      >
        {bookLabel}
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
  } else if (editingUnpaid) {
    action = (
      <button
        onClick={continueUnpaid}
        disabled={isPending}
        className={`mt-4 w-full ${ctaClass}`}
      >
        {isPending ? t.common.loading : t.myTickets.paySubmit}
      </button>
    );
  } else if (buyingMore && !pendingPayment && hasRoom) {
    action = (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setCollecting(true)}
          disabled={isPending}
          className={ctaClass}
        >
          {isPending ? t.common.loading : moreLabel}
        </button>
        {status !== "CHECKED_IN" && currentRegistrationId ? (
          <button
            onClick={() => {
              startTransition(async () => {
                setError(null);
                setErrorHref(null);
                const res = await cancelRegistration(currentRegistrationId);
                const failed = bookingError(res);
                if (failed) {
                  setError(failed.message);
                  setErrorHref(failed.href);
                } else {
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
                setErrorHref(null);
                const res = await cancelRegistration(currentRegistrationId);
                const failed = bookingError(res);
                if (failed) {
                  setError(failed.message);
                  setErrorHref(failed.href);
                } else setStatus("CANCELLED");
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
        onClick={() => setCollecting(true)}
        disabled={isPending || isFull}
        className={`mt-4 w-full ${ctaClass}`}
      >
        {isPending ? t.common.loading : isFull ? t.eventDetail.soldOut : bookLabel}
      </button>
    );
  }

  return (
    <div>
      {ticketRow}
      {collecting && holderCount >= 1 ? (
        <HolderForm
          key={editingUnpaid ? "pending" : buyingMore ? "more" : "new"}
          count={holderCount}
          buyer={buyer}
          allowSelf={allowSelf}
          pending={isPending}
          tone={freeEvent ? "free" : "paid"}
          submitLabel={editingUnpaid ? t.myTickets.paySubmit : buyingMore ? moreLabel : bookLabel}
          onCancel={() => setCollecting(false)}
          onSubmit={(holders) =>
            editingUnpaid ? placePending(holders) : buyingMore ? placeExtra(holders) : placeNew(holders)
          }
        />
      ) : (
        action
      )}
      {(status === "PENDING" || pendingPayment) && currentRegistrationId && !editingUnpaid ? (
        <Link
          href={`/events/${slug}/pay`}
          className="mt-4 inline-flex text-sm font-medium text-gray-900 underline"
        >
          {t.myTickets.paySubmit}
        </Link>
      ) : null}
      {error ? <ActionError message={error} href={errorHref} linkLabel={t.blacklist.seeHistory} /> : null}
    </div>
  );
}
