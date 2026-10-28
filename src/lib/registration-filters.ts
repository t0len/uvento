import { PaymentStatus, Prisma, RegistrationStatus } from "@prisma/client";

const STATUSES: RegistrationStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "CHECKED_IN"];
const PAYMENTS: PaymentStatus[] = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];

export type RegistrationFilters = {
  q?: string;
  status?: string;
  event?: string;
  payment?: string;
};

export function registrationWhere(organizationIds: string[], filters: RegistrationFilters): Prisma.RegistrationWhereInput {
  const where: Prisma.RegistrationWhereInput = {
    event: {
      organizationId: { in: organizationIds },
      ...(filters.event ? { id: filters.event } : {}),
    },
  };

  if (filters.status && STATUSES.includes(filters.status as RegistrationStatus)) {
    where.status = filters.status as RegistrationStatus;
  }

  const q = filters.q?.trim();
  if (q) {
    where.user = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  if (filters.payment === "NONE") {
    where.payment = { is: null };
  } else if (filters.payment && PAYMENTS.includes(filters.payment as PaymentStatus)) {
    where.payment = { is: { status: filters.payment as PaymentStatus } };
  }

  return where;
}

export function filterQuery(filters: RegistrationFilters) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.status) query.set("status", filters.status);
  if (filters.event) query.set("event", filters.event);
  if (filters.payment) query.set("payment", filters.payment);
  return query;
}
