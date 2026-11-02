import type { Dictionary } from "@/lib/i18n/dictionaries";

export function errorText(t: Dictionary, code: string) {
  if (code in t.errors) return t.errors[code as keyof typeof t.errors];
  return code;
}
