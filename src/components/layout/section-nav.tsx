"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SectionNav({
  links,
  className = "md:hidden",
}: {
  links: { href: string; label: string }[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={`flex gap-2 overflow-x-auto px-4 pb-3 ${className}`}>
      {links.map((link) => {
        const active =
          link.href === "/dashboard" || link.href === "/admin"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
