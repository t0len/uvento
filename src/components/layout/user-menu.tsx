"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { useI18n } from "@/components/i18n/i18n-provider";

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    role === "ADMIN"
      ? t.menu.roleAdmin
      : role === "ORGANIZER"
        ? t.menu.roleOrganizer
        : t.menu.roleStudent;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-50">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">{email}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                role === "ADMIN"
                  ? "bg-red-100 text-red-700"
                  : role === "ORGANIZER"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {roleLabel}
            </span>
          </div>

          {role === "STUDENT" && (
            <div className="py-1">
              <MenuLink href="/my/tickets" onClick={() => setOpen(false)} label={t.menu.myTickets} />
              <MenuLink href="/my/events" onClick={() => setOpen(false)} label={t.menu.myEvents} />
              <MenuLink href="/my/settings" onClick={() => setOpen(false)} label={t.menu.settings} />
            </div>
          )}

          {role === "ORGANIZER" && (
            <div className="py-1">
              <MenuLink
                href="/dashboard"
                onClick={() => setOpen(false)}
                label={t.menu.organizerDashboard}
                highlight
              />
              <MenuLink href="/my/tickets" onClick={() => setOpen(false)} label={t.menu.myTickets} />
              <MenuLink href="/my/settings" onClick={() => setOpen(false)} label={t.menu.settings} />
            </div>
          )}

          {role === "ADMIN" && (
            <div className="py-1">
              <MenuLink
                href="/admin"
                onClick={() => setOpen(false)}
                label={t.menu.adminPanel}
                highlight
              />
              <MenuLink href="/my/settings" onClick={() => setOpen(false)} label={t.menu.settings} />
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-2">
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  label,
  onClick,
  highlight,
}: {
  href: string;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
        highlight ? "font-medium text-gray-900" : "text-gray-700"
      }`}
    >
      {label}
    </Link>
  );
}
