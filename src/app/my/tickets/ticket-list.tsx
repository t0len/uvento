"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { QRTicket } from "./qr-ticket";

export type TicketItem = {
  id: string;
  ticketCode: string;
  status: string;
  statusLabel: string;
  title: string;
  slug: string;
  when: string;
  place: string;
  upcoming: boolean;
};

export function TicketList({ tickets }: { tickets: TicketItem[] }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = tickets.filter((ticket) => (tab === "upcoming" ? ticket.upcoming : !ticket.upcoming));

  return (
    <div>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === "upcoming" ? "bg-gray-900 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
          }`}
        >
          {t.myTickets.upcoming}
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === "past" ? "bg-gray-900 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
          }`}
        >
          {t.myTickets.past}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-gray-500">{t.myTickets.empty}</p>
      ) : (
        <div className={`mt-6 space-y-4 ${tab === "past" ? "opacity-70" : ""}`}>
          {visible.map((ticket) => {
            const open = openId === ticket.id;
            const showQr = ticket.status === "CONFIRMED" || ticket.status === "CHECKED_IN";
            return (
              <article key={ticket.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {showQr ? (
                    <QRTicket ticketCode={ticket.ticketCode} eventTitle={ticket.title} hint={t.myTickets.showAtEntrance} />
                  ) : (
                    <div className="flex h-[120px] w-[120px] items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                      QR
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/events/${ticket.slug}`} className="font-semibold text-gray-900 hover:underline">
                        {ticket.title}
                      </Link>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {ticket.statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{ticket.when}</p>
                    <p className="text-sm text-gray-500">{ticket.place}</p>
                    {open && (
                      <p className="mt-3 text-xs text-gray-500">
                        {t.my.ticketCode}: {ticket.ticketCode}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : ticket.id)}
                  className="mt-4 w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  {open ? t.myTickets.hideTicket : t.myTickets.showTicket}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
