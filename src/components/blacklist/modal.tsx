"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = "md",
  busy = false,
  busyLabel,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: "md" | "xl";
  busy?: boolean;
  busyLabel?: string;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, busy]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={title}
        className="absolute inset-0 bg-gray-900/40"
        onClick={busy ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blacklist-dialog-title"
        aria-busy={busy}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${
          width === "xl" ? "max-w-2xl" : "max-w-md"
        }`}
      >
        {busy ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/90">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            {busyLabel ? <p className="text-sm font-medium text-gray-900">{busyLabel}</p> : null}
          </div>
        ) : null}
        <div className={`overflow-y-auto ${width === "xl" ? "p-6 sm:p-7" : "p-5"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="blacklist-dialog-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
              {subtitle ? <p className="mt-1 break-words text-sm text-gray-500">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              ×
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
