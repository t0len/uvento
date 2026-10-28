import { requireRole } from "@/lib/auth";
import { getI18n, localeDate } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { membershipOrganizations } from "@/lib/organizations";
import { formatEventDate } from "@/lib/format";
import { CheckInForm } from "./check-in-form";

export default async function DashboardCheckInPage() {
  const user = await requireRole("ORGANIZER");
  const { locale, t } = await getI18n();
  const organizations = await membershipOrganizations(user.id);
  const orgIds = organizations.map((org) => org.id);
  const events =
    orgIds.length > 0
      ? await prisma.event.findMany({
          where: {
            organizationId: { in: orgIds },
            status: "PUBLISHED",
            endDate: { gte: new Date() },
          },
          select: { id: true, title: true, startDate: true },
          orderBy: { startDate: "asc" },
        })
      : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.checkInTitle}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.dashboard.checkInHint}</p>
      <div className="mt-8">
        {events.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{t.dashboard.checkInNoEvents}</p>
        ) : (
          <CheckInForm
            events={events.map((event) => ({
              id: event.id,
              label: `${event.title} · ${formatEventDate(event.startDate, localeDate[locale])}`,
            }))}
          />
        )}
      </div>
    </div>
  );
}
