export function personName(person: { name: string; lastName?: string | null }) {
  return [person.name, person.lastName].map((part) => part?.trim()).filter(Boolean).join(" ");
}

/** Keep a dialable number. Local 10-digit and 8-prefixed numbers are treated as Kazakhstan. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return trimmed.startsWith("+") ? `+${digits}` : `+${digits}`;
}
