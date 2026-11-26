"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/actions/blacklist";
import { useI18n } from "@/components/i18n/i18n-provider";
import { BLOCK_REASON_WORD_LIMIT, countWords } from "@/lib/block-reason";
import { Modal } from "./modal";

const MAX_FILE = 5 * 1024 * 1024;

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function ReasonDialog({
  mode,
  userId,
  organizationId,
  name,
  email,
  onClose,
}: {
  mode: "block" | "unblock";
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = saving || pending;
  const words = countWords(reason);
  const over = words > BLOCK_REASON_WORD_LIMIT;
  const blocking = mode === "block";

  function chooseFile(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > MAX_FILE) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setError(t.errors.documentSize);
      return;
    }
    setFile(next);
  }

  function submit() {
    if (words === 0 || over || busy) return;
    setError(null);
    setSaving(true);
    const data = new FormData();
    data.set("organizationId", organizationId);
    data.set("userId", userId);
    data.set("reason", reason);
    if (file) data.set("document", file);
    startTransition(async () => {
      const result = blocking ? await blockUser(data) : await unblockUser(data);
      if ("error" in result) {
        setError(result.error);
        setSaving(false);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal
      title={fill(blocking ? t.blacklist.blockTitle : t.blacklist.unblockTitle, { name })}
      subtitle={email}
      onClose={onClose}
      busy={busy}
      busyLabel={t.common.loading}
    >
      <p className={`rounded-xl px-3 py-2 text-sm ${blocking ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-700"}`}>
        {blocking ? fill(t.blacklist.blockNotice, { name }) : t.blacklist.unblockNotice}
      </p>
      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="block text-sm font-medium text-gray-700" htmlFor="block-reason">
          {t.blacklist.reason}
        </label>
          <textarea
          id="block-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={5}
          autoFocus
          disabled={busy}
          placeholder={t.blacklist.reasonPlaceholder}
          className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
        <p className={`mt-1 text-right text-xs ${over ? "text-red-600" : words > 200 ? "text-amber-600" : "text-gray-400"}`}>
          {fill(t.blacklist.words, { count: words })}
        </p>
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="truncate text-sm text-gray-700">{file.name}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-800"
              >
                {t.blacklist.removeFile}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-3 text-left hover:border-gray-400 hover:bg-gray-50"
            >
              <span className="block text-sm font-medium text-gray-800">{t.blacklist.attach}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{t.blacklist.attachHint}</span>
            </button>
          )}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t.dashboard.cancel}
          </button>
          <button
            type="submit"
            disabled={busy || words === 0 || over}
            aria-busy={busy}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              blocking ? "bg-red-600 hover:bg-red-700" : "bg-gray-900 hover:bg-gray-800"
            }`}
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : null}
            {busy ? t.common.loading : blocking ? t.blacklist.block : t.blacklist.unblock}
          </button>
        </div>
      </form>
    </Modal>
  );
}
