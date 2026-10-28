import { prisma } from "@/lib/prisma";

export async function membershipOrganizations(userId: string) {
  const rows = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organization: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((row) => row.organization);
}
