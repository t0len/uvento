"use client";

import { useRef, useState, useTransition } from "react";
import { loadBlacklistHistory } from "@/actions/blacklist";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { BlockHistoryEntry } from "@/lib/block-reason";
import { BlockHistory } from "./history";
import { Modal } from "./modal";

export function ReviewButton({
  blacklistId,
  name,
  email,
  phone,
}: {
  blacklistId: string;
  name: string;
  email: string;
  phone: string | null;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<BlockHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const request = useRef(0);
  const contact = [email, phone].filter(Boolean).join(" · ");

  function openReview() {
    const id = ++request.current;
    setOpen(true);
    setError(null);
    setEntries(null);
    startTransition(async () => {
      const result = await loadBlacklistHistory(blacklistId);
      if (request.current !== id) return;
      if ("error" in result) setError(result.error);
      else setEntries(result.entries);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openReview}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {t.blacklist.review}
      </button>
      {open ? (
        <Modal title={name} subtitle={contact} onClose={() => setOpen(false)} width="xl">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {entries ? (
            <BlockHistory entries={entries} />
          ) : error ? null : (
            <p className="text-sm text-gray-500">{t.common.loading}</p>
          )}
        </Modal>
      ) : null}
    </>
  );
}
