import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex h-64 items-center justify-center bg-gray-200">
            <svg className="h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              {event.categories.map((ec) => (
                <span key={ec.categoryId} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">
                  {ec.category.name}
                </span>
              ))}
              {isCancelled && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  {t.status.CANCELLED}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">{event.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {tReplace(t.eventDetail.by, { name: event.organization.name })}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(event.startDate).toLocaleDateString(localeDate[locale], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.startDate).toLocaleTimeString(localeDate[locale], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    —{" "}
                    {new Date(event.endDate).toLocaleTimeString(localeDate[locale], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">{event.location}</p>
                  {event.venue && <p className="text-sm text-gray-500">{event.venue}</p>}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 rounded-lg bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-500">{t.eventDetail.price}</p>
                <p className="text-lg font-bold text-gray-900">
                  {event.price > 0 ? `${event.price} KZT` : t.common.free}
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-sm text-gray-500">{t.eventDetail.spotsLeft}</p>
                <p className="text-lg font-bold text-gray-900">
                  {spotsLeft > 0 ? spotsLeft : t.eventDetail.soldOut}
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-sm text-gray-500">{t.eventDetail.registered}</p>
                <p className="text-lg font-bold text-gray-900">{event._count.registrations}</p>
              </div>
            </div>

            <div className="mt-6">
              <RegisterButton
                eventId={event.id}
                isLoggedIn={!!session?.user}
                existingStatus={userRegistration?.status ?? null}
                isCancelled={isCancelled}
                isPast={isPast}
                isFull={spotsLeft <= 0}
              />
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900">{t.eventDetail.about}</h2>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {event.description}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
