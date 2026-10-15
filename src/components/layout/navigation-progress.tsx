"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/i18n-provider";

export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const token = useRef(0);
  const shownAt = useRef(0);

  useEffect(() => {
    const current = token.current;
    const wait = Math.max(0, 700 - (Date.now() - shownAt.current));
    const id = window.setTimeout(() => {
      if (token.current === current) setActive(false);
    }, wait);
    return () => window.clearTimeout(id);
  }, [pathname, search]);

  function begin() {
    token.current += 1;
    shownAt.current = Date.now();
    setActive(true);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      begin();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!active) return null;

  return (
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
  );
}
