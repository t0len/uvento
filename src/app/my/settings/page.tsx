import { requireAuth } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";

export default async function MySettingsPage() {
  const user = await requireAuth();
  const { t } = await getI18n();

  const roleLabel =
    user.role === "ADMIN"
      ? t.menu.roleAdmin
      : user.role === "ORGANIZER"
        ? t.menu.roleOrganizer
        : t.menu.roleStudent;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.my.settings}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.my.profileReadonly}</p>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
          <div>
            <label className="text-sm font-medium text-gray-500">{t.common.name}</label>
            <p className="mt-1 text-gray-900">{user.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">{t.common.email}</label>
            <p className="mt-1 text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">{t.common.role}</label>
            <p className="mt-1">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {roleLabel}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
