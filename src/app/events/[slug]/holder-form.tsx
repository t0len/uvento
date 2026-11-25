"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";

export type HolderDraft = { name: string; lastName: string; phone: string };

const emptyHolder = (): HolderDraft => ({ name: "", lastName: "", phone: "" });

const fieldClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

export function HolderForm({
  count,
  buyer,
  pending,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  count: number;
  buyer: HolderDraft | null;
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (holders: HolderDraft[]) => void;
}) {
  const { t } = useI18n();
  const profile = buyer && (buyer.name || buyer.lastName || buyer.phone) ? buyer : null;
  const [rows, setRows] = useState<HolderDraft[]>(() => Array.from({ length: count }, emptyHolder));
  const [forMe, setForMe] = useState<boolean[]>(() => Array.from({ length: count }, () => false));

  useEffect(() => {
    setRows((current) => {
      if (current.length === count) return current;
      if (current.length < count) {
        return [...current, ...Array.from({ length: count - current.length }, emptyHolder)];
      }
      return current.slice(0, count);
    });
    setForMe((current) => {
      if (current.length === count) return current;
      if (current.length < count) return [...current, ...Array.from({ length: count - current.length }, () => false)];
      return current.slice(0, count);
    });
  }, [count]);

  function update(index: number, field: keyof HolderDraft, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  function toggleForMe(index: number) {
    const next = !forMe[index];
    setForMe((current) => current.map((value, rowIndex) => (rowIndex === index ? next : value)));
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        if (next && profile) return { name: profile.name, lastName: profile.lastName, phone: profile.phone };
        return emptyHolder();
      }),
    );
  }

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(rows);
      }}
    >
      {rows.map((row, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            {count > 1 ? (
              <span className="text-sm font-medium text-gray-900">
                {t.eventDetail.ticketFor.replace("{n}", String(index + 1))}
              </span>
            ) : (
              <span />
            )}
            {profile ? (
              <button
                type="button"
                aria-pressed={forMe[index] ?? false}
                onClick={() => toggleForMe(index)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  forMe[index]
                    ? "bg-gray-900 text-white"
                    : "border border-gray-300 text-gray-800 hover:bg-gray-50"
                }`}
              >
                {t.eventDetail.forMe}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-gray-600">
              {t.common.name}
              <input
                required
                minLength={2}
                autoComplete="given-name"
                value={row.name}
                onChange={(event) => update(index, "name", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm text-gray-600">
              {t.common.lastName}
              <input
                required
                minLength={2}
                autoComplete="family-name"
                value={row.lastName}
                onChange={(event) => update(index, "lastName", event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <label className="block text-sm text-gray-600">
            {t.common.phone}
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 700 000 00 00"
              value={row.phone}
              onChange={(event) => update(index, "phone", event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      ))}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
        >
          {t.common.back}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? t.common.loading : submitLabel}
        </button>
      </div>
    </form>
  );
}
