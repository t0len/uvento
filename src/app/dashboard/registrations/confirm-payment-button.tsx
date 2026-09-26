"use client";

import { useTransition, useState } from "react";
import { confirmPayment } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";

export function ConfirmPaymentButton({ registrationId }: { registrationId: string }) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-xs text-green-600">{t.dashboard.confirmed}</span>;
  }

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const res = await confirmPayment(registrationId);
          if (res?.success) setDone(true);
        });
      }}
      disabled={isPending}
      className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? "…" : t.dashboard.confirmPaymentFull}
    </button>
  );
}
