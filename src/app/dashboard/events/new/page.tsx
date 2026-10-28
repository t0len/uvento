import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { membershipOrganizations } from "@/lib/organizations";
import { getI18n } from "@/lib/i18n";
import { EventForm } from "./event-form";

export default async function NewEventPage() {
  const user = await requireRole("ORGANIZER");
  const { t } = await getI18n();
  const [categories, organizations] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    membershipOrganizations(user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.createEvent}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.dashboard.createEventHint}</p>
      <div className="mt-8">
        {organizations.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{t.dashboard.noOrganization}</p>
        ) : (
          <EventForm categories={categories} organizations={organizations} />
        )}
      </div>
    </div>
  );
}
