import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Uvento
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/events"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            События
          </Link>
          {session?.user ? (
            <>
              {(session.user.role === "ORGANIZER" ||
                session.user.role === "ADMIN") && (
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Панель управления
                </Link>
              )}
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Админ
                </Link>
              )}
              <Link
                href="/my/tickets"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Мои билеты
              </Link>
              <span className="text-sm text-gray-500">
                {session.user.name}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
