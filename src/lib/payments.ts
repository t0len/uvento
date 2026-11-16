import type { PaymentStatus } from "@prisma/client";

export type PaymentSnapshot = {
  id: string;
  status: PaymentStatus;
  amount: number;
  quantity: number;
  createdAt: Date;
  reservedUntil?: Date | null;
};

const OPEN_RANK: Partial<Record<PaymentStatus, number>> = {
  PENDING: 0,
  FAILED: 1,
};

export function displayPayment<T extends { status: PaymentStatus; createdAt: Date }>(payments: T[]) {
  if (payments.length === 0) return null;
  const open = payments
    .filter((payment) => payment.status === "PENDING" || payment.status === "FAILED")
    .sort((a, b) => (OPEN_RANK[a.status] ?? 9) - (OPEN_RANK[b.status] ?? 9) || b.createdAt.getTime() - a.createdAt.getTime());
  if (open.length > 0) return open[0];
  const completed = payments
    .filter((payment) => payment.status === "COMPLETED")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (completed.length > 0) return completed[0];
  return [...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export function completedRevenue(payments: { status: PaymentStatus; amount: number }[]) {
  return payments.reduce((sum, payment) => sum + (payment.status === "COMPLETED" ? payment.amount : 0), 0);
}
