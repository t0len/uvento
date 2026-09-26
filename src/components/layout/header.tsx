import Link from "next/link";
import { auth } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "@/components/i18n/i18n-provider";

export async function Header() {
  const session = await auth();
  const { t } = await getI18n();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-gray-900">
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

        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          {session?.user ? (
            <UserMenu
              name={session.user.name || t.common.user}
              email={session.user.email || ""}
              role={session.user.role || "STUDENT"}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.nav.login}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {t.nav.signup}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
