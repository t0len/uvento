import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { UserMenu } from "./user-menu";
import { SectionNav } from "./section-nav";
import { LanguageSwitcher } from "@/components/i18n/i18n-provider";

export async function Header() {
  const user = await currentUser();
  const { t } = await getI18n();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="shrink-0 text-xl font-bold text-gray-900">
            Uvento
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/events"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {t.nav.events}
            </Link>
            <Link
              href="/organizations"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {t.nav.organizations}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {t.nav.about}
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher compact />
          {user ? (
            <UserMenu name={user.name || t.common.user} email={user.email} role={user.role} />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:px-4 sm:py-2 sm:text-sm"
              >
                {t.nav.login}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-800 sm:px-4 sm:py-2 sm:text-sm"
              >
                {t.nav.signup}
              </Link>
            </>
          )}
        </div>
      </div>
      <SectionNav
        links={[
          { href: "/events", label: t.nav.events },
          { href: "/organizations", label: t.nav.organizations },
          { href: "/about", label: t.nav.about },
        ]}
      />
    </header>
  );
}
