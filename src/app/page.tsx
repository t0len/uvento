import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
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

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            Все события твоего{" "}
            <span className="text-blue-600">университета</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Находи мероприятия, регистрируйся, оплачивай и получай QR-билеты —
            всё в одном месте. Никаких очередей и бумажных списков.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/events"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Смотреть события
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Создать аккаунт
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
