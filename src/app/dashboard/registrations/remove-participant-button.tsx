"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelRegistration } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";

export function RemoveParticipantButton({ registrationId }: { registrationId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await cancelRegistration(registrationId);
          if (res?.success) router.refresh();
        });
      }}
      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "…" : t.dashboard.removeParticipant}
    </button>
  );
}
