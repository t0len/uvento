"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";

export type HolderDraft = { name: string; lastName: string; phone: string };

const emptyHolder = (): HolderDraft => ({ name: "", lastName: "", phone: "" });

function blankDraft(count: number) {
  return {
    rows: Array.from({ length: count }, emptyHolder),
    forMe: Array.from({ length: count }, () => false),
  };
}

function resizeDraft(current: ReturnType<typeof blankDraft>, count: number) {
  if (current.rows.length === count) return current;
  if (current.rows.length < count) {
    const extra = count - current.rows.length;
    return {
      rows: [...current.rows, ...Array.from({ length: extra }, emptyHolder)],
      forMe: [...current.forMe, ...Array.from({ length: extra }, () => false)],
    };
  }
  return { rows: current.rows.slice(0, count), forMe: current.forMe.slice(0, count) };
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

export function HolderForm({
  count,
  buyer,
  allowSelf = true,
  pending,
  submitLabel,
  tone = "paid",
  onCancel,
  onSubmit,
}: {
  count: number;
  buyer: HolderDraft | null;
  allowSelf?: boolean;
  pending: boolean;
  submitLabel: string;
  tone?: "paid" | "free";
  onCancel: () => void;
  onSubmit: (holders: HolderDraft[]) => void;
}) {
  const { t } = useI18n();
  const profile = buyer && (buyer.name || buyer.lastName || buyer.phone) ? buyer : null;
  const [draft, setDraft] = useState(() => blankDraft(count));
  const [sizedFor, setSizedFor] = useState(count);
  if (count !== sizedFor) {
    setSizedFor(count);
    setDraft((current) => resizeDraft(current, count));
  }
  const { rows, forMe } = draft;

  function matchesProfile(row: HolderDraft) {
    return Boolean(
      profile && row.name === profile.name && row.lastName === profile.lastName && row.phone === profile.phone,
    );
  }

  function update(index: number, field: keyof HolderDraft, value: string) {
    setDraft((current) => {
      const nextRows = current.rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      );
      return {
        rows: nextRows,
        forMe: current.forMe.map((selected, rowIndex) => {
          if (rowIndex !== index) return selected;
          const matches = matchesProfile(nextRows[index]);
          if (matches && current.forMe.some((flag, flagIndex) => flag && flagIndex !== index)) return false;
          return matches;
        }),
      };
    });
  }

  function toggleForMe(index: number) {
    if (!profile || !allowSelf) return;
    setDraft((current) => {
      const turningOn = !current.forMe[index];
      if (turningOn && current.forMe.some((selected, rowIndex) => selected && rowIndex !== index)) return current;
      return {
        forMe: current.forMe.map((selected, rowIndex) => (rowIndex === index ? turningOn : selected)),
        rows: current.rows.map((row, rowIndex) => {
          if (rowIndex !== index) return row;
          if (turningOn) return { name: profile.name, lastName: profile.lastName, phone: profile.phone };
          return emptyHolder();
        }),
      };
    });
  }

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(rows);
      }}
    >
      {rows.map((row, index) => {
        const anyForMe = forMe.some(Boolean);
        const showForMe = Boolean(profile) && allowSelf && (Boolean(forMe[index]) || !anyForMe);
        const showTicketLabel = count > 1;
        return (
          <div key={index} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            {showTicketLabel || showForMe ? (
              <div className="flex items-center justify-between gap-3">
                {showTicketLabel ? (
                  <span className="text-sm font-medium text-gray-900">
                    {t.eventDetail.ticketFor.replace("{n}", String(index + 1))}
                  </span>
                ) : (
                  <span />
                )}
                {showForMe ? (
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
            ) : null}
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
        );
      })}
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
          className={
            tone === "free"
              ? "rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50"
              : "rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
          }
        >
          {pending ? t.common.loading : submitLabel}
        </button>
      </div>
    </form>
  );
}
