"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { BlockHistoryEntry } from "@/lib/block-reason";
import { BlockHistory } from "./history";
import { Modal } from "./modal";

export function ReviewButton({
  name,
  email,
  phone,
  active,
  entries,
}: {
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  entries: BlockHistoryEntry[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const contact = [email, phone].filter(Boolean).join(" · ");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {t.blacklist.review}
      </button>
      {open ? (
        <Modal title={name} subtitle={contact} onClose={() => setOpen(false)} wide>
          <p className="mb-4">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                active ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
              }`}
            >
              {active ? t.blacklist.blockedNow : t.blacklist.clearNow}
            </span>
          </p>
          <BlockHistory entries={entries} />
        </Modal>
      ) : null}
    </>
  );
}
