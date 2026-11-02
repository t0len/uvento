export const MAX_TICKETS_PER_ORDER = 10;

export function ticketQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) return null;
  return quantity;
}
