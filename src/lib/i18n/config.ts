export const locales = ["ru", "kk", "en"] as const;
export type Locale = (typeof locales)[number];

/** Default UI language everywhere unless the user picks another. */
export const defaultLocale: Locale = "ru";

export const localeLabels: Record<Locale, string> = {
  ru: "Рус",
  kk: "Қаз",
  en: "Eng",
};

export const localeHtmlLang: Record<Locale, string> = {
  ru: "ru",
  kk: "kk",
  en: "en",
};

export const localeDate: Record<Locale, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-US",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
