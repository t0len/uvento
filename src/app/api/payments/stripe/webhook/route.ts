import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckoutSession, markStripePaymentFailed } from "@/lib/stripe-checkout";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await fulfillCheckoutSession(event.data.object.id, undefined, true);
  } else if (event.type === "payment_intent.payment_failed") {
    await markStripePaymentFailed(event.data.object);
  }

  return NextResponse.json({ received: true });
}
