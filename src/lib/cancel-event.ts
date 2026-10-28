import { prisma } from "@/lib/prisma";

export async function cancelEventWithTickets(eventId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: {
        status: "COMPLETED",
        registration: { eventId, status: { in: ["PENDING", "CONFIRMED"] } },
      },
      data: { status: "REFUNDED" },
    });
    await tx.registration.updateMany({
      where: { eventId, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "CANCELLED" },
    });
    await tx.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
    });
  });
}
