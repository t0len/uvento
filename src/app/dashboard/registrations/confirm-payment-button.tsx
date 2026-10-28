"use client";

import { useTransition, useState } from "react";
import { confirmPayment } from "@/actions/registrations";
import { useI18n } from "@/components/i18n/i18n-provider";

export function ConfirmPaymentButton({ registrationId }: { registrationId: string }) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-xs text-green-600">{t.dashboard.confirmed}</span>;
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={() => {
          startTransition(async () => {
            const res = await confirmPayment(registrationId);
            if (res?.error) setError(res.error);
            if (res?.success) setDone(true);
          });
        }}
        disabled={isPending}
        className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? "…" : t.dashboard.confirmPaymentFull}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
