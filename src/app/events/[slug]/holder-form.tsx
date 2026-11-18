"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";

export type HolderDraft = { name: string; lastName: string; phone: string };

export function HolderForm({
  count,
  buyer,
  prefillBuyer,
  pending,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  count: number;
  buyer: HolderDraft | null;
  prefillBuyer: boolean;
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (holders: HolderDraft[]) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<HolderDraft[]>(() =>
    Array.from({ length: count }, (_, index) =>
      index === 0 && prefillBuyer && buyer
        ? { name: buyer.name, lastName: buyer.lastName, phone: buyer.phone }
        : { name: "", lastName: "", phone: "" },
    ),
  );

  function update(index: number, field: keyof HolderDraft, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(rows);
      }}
    >
      <div>
        <h3 className="text-base font-semibold text-gray-900">{t.eventDetail.holdersTitle}</h3>
        <p className="mt-1 text-sm text-gray-500">{t.eventDetail.holdersHint}</p>
      </div>
      {rows.map((row, index) => (
        <fieldset key={index} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <legend className="px-1 text-sm font-medium text-gray-900">
            {t.eventDetail.ticketFor.replace("{n}", String(index + 1))}
          </legend>
          <label className="block text-sm text-gray-700">
            {t.common.name}
            <input
              required
              minLength={2}
              value={row.name}
              onChange={(event) => update(index, "name", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
            />
          </label>
          <label className="block text-sm text-gray-700">
            {t.common.lastName}
            <input
              required
              minLength={2}
              value={row.lastName}
              onChange={(event) => update(index, "lastName", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
            />
          </label>
          <label className="block text-sm text-gray-700">
            {t.common.phone}
            <input
              required
              type="tel"
              inputMode="tel"
              placeholder="+7 700 000 00 00"
              value={row.phone}
              onChange={(event) => update(index, "phone", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
            />
          </label>
        </fieldset>
      ))}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          {t.common.back}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? t.common.loading : submitLabel}
        </button>
      </div>
    </form>
  );
}
