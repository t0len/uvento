import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { EventForm } from "./event-form";

export default async function NewEventPage() {
  await requireRole("ORGANIZER");
  const { t } = await getI18n();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.createEvent}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.dashboard.createEventHint}</p>
      <div className="mt-8">
        <EventForm categories={categories} />
      </div>
    </div>
  );
}
