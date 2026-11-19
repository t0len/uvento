import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { forgetExpiredReservations } from "@/lib/reservations";
import { PayScreen } from "./pay-screen";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requireAuth();
  const { slug: rawSlug } = await params;
  const { payment } = await searchParams;
  const slug = decodeURIComponent(rawSlug);

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.status === "DRAFT") notFound();

  await forgetExpiredReservations(event.id);

  const registration = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: event.id } },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
  const now = new Date();
  const pendingPayment = registration?.payments.find(
    (item) => item.status === "PENDING" && (!item.reservedUntil || item.reservedUntil >= now),
  );
  const addon = registration?.status === "CONFIRMED" || registration?.status === "CHECKED_IN";
  const initialHold =
    registration?.status === "PENDING" &&
    registration.reservedUntil &&
    registration.reservedUntil >= now;
  if (!registration || !pendingPayment || (!addon && !initialHold)) {
    redirect(`/events/${event.slug}`);
  }

  const reservedUntil = (addon ? pendingPayment.reservedUntil : registration.reservedUntil) ?? pendingPayment.reservedUntil;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <PayScreen
        registrationId={registration.id}
        paymentId={pendingPayment.id}
        reservedUntil={reservedUntil?.toISOString() ?? null}
        cancelled={payment === "cancelled"}
        quantity={pendingPayment.quantity}
        amount={event.price * pendingPayment.quantity}
        unitPrice={event.price}
      />
    </div>
  );
}
