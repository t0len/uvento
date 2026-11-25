import { requireAuth } from "@/lib/auth";
import { personName } from "@/lib/person";
import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export default async function MyPage() {
  const user = await requireAuth();
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.my.account}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {personName(user)} — {user.email}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/my/tickets"
          className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <h3 className="mt-2 font-semibold text-gray-900">{t.my.tickets}</h3>
          <p className="mt-1 text-sm text-gray-500">{t.my.ticketsSub}</p>
        </Link>

        <Link
          href="/my/settings"
          className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <h3 className="mt-2 font-semibold text-gray-900">{t.my.settings}</h3>
          <p className="mt-1 text-sm text-gray-500">{t.my.settingsSub}</p>
        </Link>

        <Link
          href="/my/restrictions"
          className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <h3 className="mt-2 font-semibold text-gray-900">{t.blacklist.myCard}</h3>
          <p className="mt-1 text-sm text-gray-500">{t.blacklist.myCardSub}</p>
        </Link>
      </div>
    </div>
  );
}
