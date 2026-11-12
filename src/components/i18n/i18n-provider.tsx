"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  LOCALE_COOKIE,
  localeLabels,
  locales,
  type Locale,
} from "@/lib/i18n/config";

type I18nContextValue = {
  locale: Locale;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(code: Locale) {
    setOpen(false);
    if (code === locale || pending) return;
    document.cookie = `${LOCALE_COOKIE}=${code}; Path=/; Max-Age=${LOCALE_MAX_AGE}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      {pending ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
          <div className="h-1 overflow-hidden bg-gray-200">
            <div className="h-full w-1/3 bg-gray-900" style={{ animation: "uvento-nav 1s ease-in-out infinite" }} />
          </div>
          <div className="mt-3 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t.common.loading}
            </div>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={pending}
        aria-label={t.nav.language}
        className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 ${
          compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-1.5"
        }`}
      >
        {pending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        ) : null}
        {localeLabels[locale]}
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 min-w-[7rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {locales.map((code) => {
            const active = code === locale;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => select(code)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 active:bg-gray-100 ${
                    active ? "font-medium text-gray-900" : "text-gray-600"
                  }`}
                >
                  {localeLabels[code]}
                  {active && (
                    <svg className="h-3.5 w-3.5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
