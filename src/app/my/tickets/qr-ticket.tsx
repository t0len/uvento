"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRTicket({
  ticketCode,
  eventTitle,
  hint,
  caption,
  shareLabel,
  fileName,
  used,
  usedLabel,
}: {
  ticketCode: string;
  eventTitle: string;
  hint?: string;
  caption?: string;
  shareLabel: string;
  fileName: string;
  used?: boolean;
  usedLabel?: string;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(ticketCode, {
      width: 240,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    }).then((url) => {
      if (active) setQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [ticketCode]);

  async function share() {
    if (!qrUrl || sharing) return;
    setSharing(true);
    const download = () => {
      const link = document.createElement("a");
      link.href = qrUrl;
      link.download = fileName;
      link.click();
    };
    try {
      const blob = await (await fetch(qrUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const payload = { files: [file], title: eventTitle, text: hint ?? eventTitle };
      if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(payload))) {
        await navigator.share(payload);
        return;
      }
      download();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      download();
    } finally {
      setSharing(false);
    }
  }

  if (!qrUrl) {
    return <div className="aspect-square w-full max-w-[240px] animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className={`flex flex-col items-center ${used ? "opacity-60" : ""}`}>
      <img src={qrUrl} alt={`QR ticket for ${eventTitle}`} className="h-auto w-full max-w-[220px] rounded-lg" />
      {hint ? <span className="mt-2 text-sm font-medium text-gray-700">{hint}</span> : null}
      {caption ? <span className="mt-1 text-xs text-gray-400">{caption}</span> : null}
      {used && usedLabel ? <span className="mt-1 text-xs text-gray-500">{usedLabel}</span> : null}
      <button
        type="button"
        onClick={share}
        disabled={sharing}
        className="mt-3 w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        {shareLabel}
      </button>
    </div>
  );
}
