"use client";

import { useState, useTransition } from "react";
import { checkIn } from "@/actions/checkin";
import { useI18n } from "@/components/i18n/i18n-provider";

type CheckInResult = {
  success?: boolean;
  error?: string;
  attendee?: { name: string; email: string; event: string };
};

export function CheckInForm() {
  const { t } = useI18n();
  const [ticketCode, setTicketCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckInResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;

    startTransition(async () => {
      const res = await checkIn(ticketCode.trim());
      setResult(res);
      if (res.success) setTicketCode("");
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value)}
          placeholder={t.dashboard.ticketPlaceholder}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={isPending || !ticketCode.trim()}
          className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t.dashboard.checking : t.dashboard.submitCheckIn}
        </button>
      </form>

      {result?.success && result.attendee && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-lg font-semibold text-green-800">{t.dashboard.checkedInOk}</p>
              <p className="text-sm text-green-700">
                {result.attendee.name} — {result.attendee.event}
              </p>
              <p className="text-xs text-green-600">{result.attendee.email}</p>
            </div>
          </div>
        </div>
      )}

      {result?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-lg font-semibold text-red-800">{t.dashboard.error}</p>
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
