"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { ReasonDialog } from "./reason-dialog";

export function BlockAction({
  userId,
  organizationId,
  blocked,
  name,
  email,
}: {
  userId: string;
  organizationId: string;
  blocked: boolean;
  name: string;
  email: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
          blocked
            ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
            : "border border-red-200 text-red-700 hover:bg-red-50"
        }`}
      >
        {blocked ? t.blacklist.unblock : t.blacklist.block}
      </button>
      {open ? (
        <ReasonDialog
          mode={blocked ? "unblock" : "block"}
          userId={userId}
          organizationId={organizationId}
          name={name}
          email={email}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
