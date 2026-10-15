"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRTicket({
  ticketCode,
  eventTitle,
  hint,
}: {
  ticketCode: string;
  eventTitle: string;
  hint?: string;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(ticketCode, {
      width: 240,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(setQrUrl);
  }, [ticketCode]);

  if (!qrUrl) {
    return <div className="aspect-square w-full max-w-[240px] animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="flex flex-col items-center">
      <img src={qrUrl} alt={`QR ticket for ${eventTitle}`} className="h-auto w-full max-w-[240px] rounded-lg" />
      {hint ? <span className="mt-1 text-xs text-gray-400">{hint}</span> : null}
    </div>
  );
}
