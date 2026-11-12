import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { releaseExpiredReservations } from "@/lib/reservations";
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

  await releaseExpiredReservations(prisma, event.id);

  const registration = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: event.id } },
  });
  if (
    !registration ||
    registration.status !== "PENDING" ||
    !registration.reservedUntil ||
    registration.reservedUntil < new Date()
  ) {
    redirect(`/events/${event.slug}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <PayScreen
        registrationId={registration.id}
        reservedUntil={registration.reservedUntil?.toISOString() ?? null}
        cancelled={payment === "cancelled"}
      />
    </div>
  );
}
