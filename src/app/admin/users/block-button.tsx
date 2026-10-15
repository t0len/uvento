"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserBlocked } from "@/actions/admin";
import { useI18n } from "@/components/i18n/i18n-provider";

export function BlockButton({ userId, blocked }: { userId: string; blocked: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await setUserBlocked(userId, !blocked);
          if (result?.error) alert(result.error);
          else router.refresh();
        });
      }}
      className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
        blocked
          ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
          : "border border-red-200 text-red-700 hover:bg-red-50"
      }`}
    >
      {pending ? "…" : blocked ? t.admin.unblock : t.admin.block}
    </button>
  );
}
