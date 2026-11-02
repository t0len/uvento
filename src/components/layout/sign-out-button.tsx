"use client";

import { useTransition } from "react";
import { signOutAction } from "@/actions/signout";
import { useI18n } from "@/components/i18n/i18n-provider";

export function SignOutButton() {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        startTransition(() => {
          void signOutAction();
        });
      }}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 disabled:bg-red-50 disabled:text-red-700"
    >
      <span>{pending ? t.menu.signingOut : t.menu.logout}</span>
      {pending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-600" />
      ) : null}
    </button>
  );
}
