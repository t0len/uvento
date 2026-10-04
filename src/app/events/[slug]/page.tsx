import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { EventCover } from "@/components/events/event-cover";
import { getI18n, localeDate, tReplace } from "@/lib/i18n";
import { RegisterButton } from "./register-button";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, t } = await getI18n();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organization: { select: { name: true, slug: true } },
      categories: { include: { category: true } },
      _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
    },
  });

  if (!event || event.status === "DRAFT") notFound();

  const session = await auth();
  let userRegistration = null;
  if (session?.user) {
    userRegistration = await prisma.registration.findUnique({
      where: { userId_eventId: { userId: session.user.id!, eventId: event.id } },
    });
  }

  const spotsLeft = event.capacity - event._count.registrations;
  const isCancelled = event.status === "CANCELLED";
  const isPast = new Date(event.endDate) < new Date();
  const dateLabel = new Date(event.startDate).toLocaleDateString(localeDate[locale], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = `${new Date(event.startDate).toLocaleTimeString(localeDate[locale], {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${new Date(event.endDate).toLocaleTimeString(localeDate[locale], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Link href="/events" className="text-sm text-gray-500 hover:text-gray-800">
          ← {t.eventDetail.back}
        </Link>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
          <EventCover
            url={event.coverImageUrl}
            label={t.eventDetail.photo}
            className="aspect-[16/10] w-full rounded-xl"
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                {dateLabel}
                <span className="mx-2 text-gray-300">·</span>
                {timeLabel}
              </p>
              <p>
                {event.location}
                {event.venue ? `, ${event.venue}` : ""}
              </p>
              <p>
                <Link href={`/organizations/${event.organization.slug}`} className="hover:text-gray-900">
                  {tReplace(t.eventDetail.organizer, { name: event.organization.name })}
                </Link>
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.categories.map((ec) => (
                <span
                  key={ec.categoryId}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                >
                  {ec.category.name}
                </span>
              ))}
              {isCancelled && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  {t.status.CANCELLED}
                </span>
              )}
            </div>
            <p className="mt-4 text-xs text-gray-400">
              {spotsLeft > 0
                ? `${spotsLeft} ${t.events.spots}`
                : t.eventDetail.soldOut}
              {" · "}
              {t.eventDetail.registered}: {event._count.registrations}
            </p>
          </div>
        </div>

        <section className="mt-10 border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900">{t.eventDetail.about}</h2>
          <div className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {event.description}
          </div>
        </section>

        <section className="mt-8 max-w-3xl">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">{t.eventDetail.ticketType}</h2>
          <RegisterButton
            eventId={event.id}
            price={event.price}
            isLoggedIn={!!session?.user}
            existingStatus={userRegistration?.status ?? null}
            registrationId={userRegistration?.id ?? null}
            isCancelled={isCancelled}
            isPast={isPast}
            isFull={spotsLeft <= 0 && userRegistration?.status !== "CONFIRMED" && userRegistration?.status !== "PENDING"}
          />
        </section>
      </main>
    </div>
  );
}
