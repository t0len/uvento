import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";
import { getStripe } from "@/lib/stripe";

const CHECKOUT_MINUTES = 31;

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
  revalidatePath("/my/events");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/registrations");
  if (slug) revalidatePath(`/events/${slug}`);
}

export async function createCheckoutUrl(registrationId: string, userId: string) {
  const stripe = getStripe();
  if (!stripe) return { error: "stripeNotConfigured" as const };

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true, event: true },
  });
  if (!registration || registration.userId !== userId) return { error: "noActiveHold" as const };
  if (
    registration.payment?.status === "COMPLETED" ||
    registration.status === "CONFIRMED" ||
    registration.status === "CHECKED_IN"
  ) {
    return { error: "paymentRecorded" as const };
  }
  if (registration.status !== "PENDING" || !registration.payment) return { error: "noActiveHold" as const };
  if (!registration.reservedUntil || registration.reservedUntil < new Date()) {
    await releaseExpiredReservations(prisma, registration.eventId);
    return { error: "reservationExpired" as const };
  }
  if (registration.event.price <= 0) return { error: "stripeCheckoutFailed" as const };

  if (registration.payment.externalId?.startsWith("cs_")) {
    const existing = await stripe.checkout.sessions.retrieve(registration.payment.externalId);
    if (existing.status === "open" && existing.url) return { url: existing.url };
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
      paymentId: registration.payment.id,
    },
    payment_intent_data: {
      metadata: { registrationId: registration.id },
    },
    line_items: [
      {
        quantity: registration.quantity,
        price_data: {
          currency: "kzt",
          unit_amount: registration.event.price * 100,
          product_data: { name: registration.event.title },
        },
      },
    ],
    success_url: `${origin}/my/tickets?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${registration.event.slug}?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
  });

  await prisma.payment.update({
    where: { id: registration.payment.id },
    data: {
      method: "stripe",
      externalId: session.id,
      status: "PENDING",
      amount: registration.event.price * registration.quantity,
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
    include: { payment: true, event: true },
  });
  if (!registration?.payment) return { error: "noActiveHold" as const };
  if (userId && registration.userId !== userId) return { error: "noActiveHold" as const };

  if (
    registration.payment.status === "COMPLETED" &&
    (registration.status === "CONFIRMED" || registration.status === "CHECKED_IN")
  ) {
    return { ok: true as const };
  }
  if (session.payment_status !== "paid") return { pending: true as const };

  const paidAt = paidAtFrom(session);
  const onTime =
    registration.status === "PENDING" &&
    registration.reservedUntil != null &&
    paidAt.getTime() <= registration.reservedUntil.getTime();
  const intentId = paymentIntentId(session);

  if (!onTime) {
    await refundPaidSession(stripe, session);
    await prisma.payment.update({
      where: { id: registration.payment.id },
      data: { status: "REFUNDED", method: "stripe", externalId: intentId, paidAt: null },
    });
    if (registration.status === "PENDING") {
      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: "CANCELLED" },
      });
    }
    if (revalidate) revalidatePayment(registration.event.slug);
    return { error: "reservationExpired" as const };
  }

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registration.id },
      data: { status: "CONFIRMED", reservedUntil: null },
    }),
    prisma.payment.update({
      where: { id: registration.payment.id },
      data: {
        status: "COMPLETED",
        paidAt,
        method: "stripe",
        externalId: intentId,
        amount: registration.event.price * registration.quantity,
      },
    }),
  ]);
  if (revalidate) revalidatePayment(registration.event.slug);
  return { ok: true as const };
}

export async function markStripePaymentFailed(intent: Stripe.PaymentIntent) {
  const registrationId = intent.metadata?.registrationId;
  if (!registrationId) return;
  await prisma.payment.updateMany({
    where: { registrationId, status: "PENDING" },
    data: { status: "FAILED", method: "stripe" },
  });
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { event: { select: { slug: true } } },
  });
  revalidatePayment(registration?.event.slug);
}
