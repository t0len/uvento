"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRTicket({ ticketCode, eventTitle }: { ticketCode: string; eventTitle: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(ticketCode, {
      width: 120,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(setQrUrl);
  }, [ticketCode]);

  if (!qrUrl) {
    return <div className="h-[120px] w-[120px] animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="flex flex-col items-center">
      <img src={qrUrl} alt={`QR ticket for ${eventTitle}`} className="rounded-lg" width={120} height={120} />
      <span className="mt-1 text-xs text-gray-400">Show at entrance</span>
    </div>
  );
}
