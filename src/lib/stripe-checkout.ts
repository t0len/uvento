import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { isUserBlocked } from "@/lib/blacklist";
import { releaseExpiredReservations } from "@/lib/reservations";
import { holdersForPass, syncTicketPasses } from "@/lib/tickets";
import { getStripe } from "@/lib/stripe";

const CHECKOUT_MINUTES = 31;

/** Stripe charges KZT in tiyn, so ₸1 000 is 100000. */
export function chargeMinor(price: number, quantity: number) {
  return price * quantity * 100;
}

export async function expireOpenCheckout(sessionId: string | null | undefined) {
  if (!sessionId?.startsWith("cs_")) return;
  const stripe = getStripe();
  if (!stripe) return;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    console.error("stripe expire", error instanceof Error ? error.message : error);
  }
}

async function appOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  const intent = session.payment_intent;
  if (typeof intent === "string") return intent;
  return intent?.id ?? session.id;
}

function paidAtFrom(session: Stripe.Checkout.Session) {
  const intent = session.payment_intent;
  if (intent && typeof intent !== "string") {
    const charge = intent.latest_charge;
    if (charge && typeof charge !== "string" && charge.created) {
      return new Date(charge.created * 1000);
    }
  }
  return new Date();
}

async function refundPaidSession(stripe: Stripe, session: Stripe.Checkout.Session) {
  const intent = session.payment_intent;
  const id = typeof intent === "string" ? intent : intent?.id;
  if (!id) return;
  if (typeof intent !== "string" && intent && intent.amount_received === 0) return;
  try {
    await stripe.refunds.create({ payment_intent: id });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === "charge_already_refunded") return;
    console.error("stripe refund failed", error instanceof Error ? error.message : error);
  }
}

function revalidatePayment(slug?: string) {
  revalidatePath("/my/tickets");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/registrations");
  if (slug) revalidatePath(`/events/${slug}`);
}

export async function createCheckoutUrl(registrationId: string, userId: string, paymentId?: string) {
  const stripe = getStripe();
  if (!stripe) return { error: "stripeNotConfigured" as const };

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payments: { orderBy: { createdAt: "desc" } }, event: true },
  });
  if (!registration || registration.userId !== userId) return { error: "noActiveHold" as const };
  if (await isUserBlocked(prisma, registration.event.organizationId, registration.userId)) {
    return { error: "blockedByOrganizer" as const };
  }

  const payment = paymentId
    ? registration.payments.find((item) => item.id === paymentId)
    : registration.payments.find((item) => item.status === "PENDING");
  if (!payment) return { error: "noActiveHold" as const };
  if (payment.status === "COMPLETED") return { error: "paymentRecorded" as const };

  const addon = registration.status === "CONFIRMED" || registration.status === "CHECKED_IN";
  if (!addon && registration.status !== "PENDING") return { error: "noActiveHold" as const };
  if (payment.status !== "PENDING") return { error: "noActiveHold" as const };

  const hold = addon ? payment.reservedUntil : registration.reservedUntil ?? payment.reservedUntil;
  if (!hold || hold < new Date()) {
    await releaseExpiredReservations(prisma, registration.eventId);
    return { error: "reservationExpired" as const };
  }
  if (registration.event.price <= 0) return { error: "stripeCheckoutFailed" as const };

  const due = chargeMinor(registration.event.price, payment.quantity);
  if (payment.externalId?.startsWith("cs_")) {
    const existing = await stripe.checkout.sessions.retrieve(payment.externalId);
    if (existing.status === "open" && existing.url && existing.amount_total === due) return { url: existing.url };
    if (existing.status === "open") await expireOpenCheckout(existing.id);
    if (existing.payment_status === "paid") {
      const fulfilled = await fulfillCheckoutSession(existing.id, userId, true);
      if ("ok" in fulfilled && fulfilled.ok) return { url: "/my/tickets" };
      if ("error" in fulfilled && fulfilled.error) return { error: fulfilled.error };
      return { error: "stripeCheckoutFailed" as const };
    }
  }

  const origin = await appOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: registration.id,
    metadata: {
      registrationId: registration.id,
      paymentId: payment.id,
    },
    payment_intent_data: {
      metadata: { registrationId: registration.id, paymentId: payment.id },
    },
    line_items: [
      {
        quantity: payment.quantity,
        price_data: {
          currency: "kzt",
          unit_amount: chargeMinor(registration.event.price, 1),
          product_data: { name: registration.event.title },
        },
      },
    ],
    success_url: `${origin}/my/tickets?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${encodeURIComponent(registration.event.slug)}/pay?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      method: "stripe",
      externalId: session.id,
      status: "PENDING",
      amount: due / 100,
    },
  });

  if (!session.url) return { error: "stripeCheckoutFailed" as const };
  return { url: session.url };
}

export async function fulfillCheckoutSession(sessionId: string, userId?: string, revalidate = false) {
  const stripe = getStripe();
  if (!stripe) return { error: "stripeNotConfigured" as const };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"],
    });
  } catch (error) {
    console.error("stripe session", error instanceof Error ? error.message : error);
    return { error: "stripeCheckoutFailed" as const };
  }
  const registrationId = session.metadata?.registrationId ?? session.client_reference_id;
  if (!registrationId) return { error: "noActiveHold" as const };

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payments: true, event: true },
  });
  if (!registration) return { error: "noActiveHold" as const };
  if (userId && registration.userId !== userId) return { error: "noActiveHold" as const };

  const paymentId = session.metadata?.paymentId;
  const payment = paymentId
    ? registration.payments.find((item) => item.id === paymentId)
    : registration.payments.find((item) => item.status === "PENDING") ?? registration.payments[0];
  if (!payment) return { error: "noActiveHold" as const };
  if (session.payment_status !== "paid") return { pending: true as const };

  const due = chargeMinor(registration.event.price, payment.quantity);
  if (session.amount_total !== due) {
    await refundPaidSession(stripe, session);
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { method: null, externalId: null, paidAt: null },
    });
    if (revalidate) revalidatePayment(registration.event.slug);
    return { error: "stripeAmountMismatch" as const };
  }
  if (payment.status === "COMPLETED") return { ok: true as const };

  const paidAt = paidAtFrom(session);
  const addon = registration.status === "CONFIRMED" || registration.status === "CHECKED_IN";
  const hold = addon ? payment.reservedUntil : registration.reservedUntil;
  const onTime =
    hold != null &&
    paidAt.getTime() <= hold.getTime() &&
    (addon || registration.status === "PENDING");
  const intentId = paymentIntentId(session);

  if (!onTime) {
    await refundPaidSession(stripe, session);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED", method: "stripe", externalId: intentId, paidAt: null },
    });
    if (!addon && registration.status === "PENDING") {
      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "CANCELLED" },
      });
    }
    if (revalidate) revalidatePayment(registration.event.slug);
    return { error: "reservationExpired" as const };
  }

  await prisma.$transaction(async (tx) => {
    const marked = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: "COMPLETED",
        paidAt,
        method: "stripe",
        externalId: intentId,
        amount: due / 100,
        reservedUntil: null,
      },
    });
    if (marked.count !== 1) return;
    const saved = addon
      ? await tx.registration.update({
          where: { id: registration.id },
          data: { quantity: { increment: payment.quantity } },
        })
      : await tx.registration.update({
          where: { id: registration.id },
          data: { status: "CONFIRMED", reservedUntil: null },
        });
    const named = addon ? holdersForPass(payment.holders, payment.quantity) : null;
    await syncTicketPasses(tx, saved, named ? { holders: named, startPosition: registration.quantity + 1 } : undefined);
  });
  if (revalidate) revalidatePayment(registration.event.slug);
  return { ok: true as const };
}

export async function markStripePaymentFailed(intent: Stripe.PaymentIntent) {
  const paymentId = intent.metadata?.paymentId;
  const registrationId = intent.metadata?.registrationId;
  if (paymentId) {
    await prisma.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "FAILED", method: "stripe" },
    });
  } else if (registrationId) {
    await prisma.payment.updateMany({
      where: { registrationId, status: "PENDING" },
      data: { status: "FAILED", method: "stripe" },
    });
  } else {
    return;
  }
  const registration = registrationId
    ? await prisma.registration.findUnique({
        where: { id: registrationId },
        select: { event: { select: { slug: true } } },
      })
    : null;
  revalidatePayment(registration?.event.slug);
}
