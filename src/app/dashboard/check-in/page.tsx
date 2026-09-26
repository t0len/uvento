import { requireRole } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { CheckInForm } from "./check-in-form";

export default async function DashboardCheckInPage() {
  await requireRole("ORGANIZER");
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.checkInTitle}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.dashboard.checkInHint}</p>
      <div className="mt-8">
        <CheckInForm />
      </div>
    </div>
  );
}
