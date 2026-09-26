import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/components/layout/user-menu";
import { LanguageSwitcher } from "@/components/i18n/i18n-provider";
import { getI18n } from "@/lib/i18n";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const { t } = await getI18n();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-xl font-bold text-gray-900">
              Uvento
            </Link>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {t.admin.badge}
            </span>
            <nav className="hidden items-center gap-5 sm:flex">
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t.admin.overview}
              </Link>
              <Link
                href="/admin/users"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t.admin.users}
              </Link>
              <Link
                href="/admin/organizations"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t.admin.organizations}
              </Link>
              <Link
                href="/admin/events"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t.admin.events}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/events"
              className="hidden text-sm text-gray-500 hover:text-gray-800 sm:inline"
            >
              {t.nav.publicSite}
            </Link>
            {session?.user && (
              <UserMenu
                name={session.user.name || t.common.user}
                email={session.user.email || ""}
                role={session.user.role || "STUDENT"}
              />
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
