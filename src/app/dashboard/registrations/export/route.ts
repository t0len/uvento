import { requireRole } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { membershipOrganizations } from "@/lib/organizations";
import { filterQuery, registrationWhere } from "@/lib/registration-filters";

function cell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const user = await requireRole("ORGANIZER");
  const { t } = await getI18n();
  const url = new URL(request.url);
  const filters = {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    event: url.searchParams.get("event") ?? undefined,
    payment: url.searchParams.get("payment") ?? undefined,
  };

  const organizations = await membershipOrganizations(user.id);
  const orgIds = organizations.map((org) => org.id);

  const registrations =
    orgIds.length > 0
      ? await prisma.registration.findMany({
          where: registrationWhere(orgIds, filters),
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { title: true } },
          payment: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const header = [t.dashboard.attendee, t.dashboard.email, t.dashboard.events, t.dashboard.date, t.dashboard.status, t.dashboard.payment];
  const rows = registrations.map((reg) => [
    reg.user.name,
    reg.user.email,
    reg.event.title,
    reg.createdAt.toISOString().slice(0, 10),
    t.status[reg.status as keyof typeof t.status] || reg.status,
    reg.payment ? t.payment[reg.payment.status as keyof typeof t.payment] || reg.payment.status : t.payment.none,
  ]);
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  const filename = filterQuery(filters).toString() ? "participants-filtered.csv" : "participants.csv";

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
