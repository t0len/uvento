import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateTimeParts } from "@/lib/format";
import { getI18n } from "@/lib/i18n";
import { EventForm } from "../../new/event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ORGANIZER");
  const { t } = await getI18n();

  const [event, categories] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        organization: { include: { members: { select: { userId: true } } } },
        categories: { select: { categoryId: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!event) notFound();
  if (!event.organization.members.some((member) => member.userId === user.id)) notFound();

  const start = dateTimeParts(event.startDate);
  const end = dateTimeParts(event.endDate);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.edit}</h1>
      <p className="mt-1 text-sm text-gray-500">{event.title}</p>
      <div className="mt-8">
        <EventForm
          categories={categories}
          eventId={event.id}
          initial={{
            title: event.title,
            description: event.description,
            shortDescription: event.shortDescription ?? "",
            location: event.location,
            venue: event.venue ?? "",
            date: start.date,
            startTime: start.time,
            endTime: end.time,
            capacity: event.capacity,
            price: event.price,
            categoryIds: event.categories.map((item) => item.categoryId),
            coverImageUrl: event.coverImageUrl,
          }}
        />
      </div>
    </div>
  );
}
