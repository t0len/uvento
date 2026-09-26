"use client";

import { signOutAction } from "@/actions/signout";
import { useI18n } from "@/components/i18n/i18n-provider";

export function SignOutButton() {
  const { t } = useI18n();

  return (
    <button
      onClick={() => signOutAction()}
      className="w-full text-left text-sm text-red-600 hover:text-red-700"
    >
      {t.menu.logout}
    </button>
  );
}
