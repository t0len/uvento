"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { QRTicket } from "./qr-ticket";

export type TicketPass = {
  code: string;
  position: number;
  checkedInAt: string | null;
};

export type TicketItem = {
  id: string;
  status: string;
  statusLabel: string;
  title: string;
  slug: string;
  when: string;
  place: string;
  upcoming: boolean;
  quantity: number;
  passes: TicketPass[];
};

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

export function TicketList({ tickets }: { tickets: TicketItem[] }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
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
            const showQr = ticket.status === "CONFIRMED" || ticket.status === "CHECKED_IN";
            return (
              <article key={ticket.id} className="rounded-xl border border-gray-200 bg-white p-5">
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
                {ticket.status === "PENDING" ? (
                  <Link
                    href={`/events/${ticket.slug}/pay`}
                    className="mt-4 inline-flex text-sm font-medium text-gray-900 underline"
                  >
                    {t.myTickets.paySubmit}
                  </Link>
                ) : null}
                {showQr ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ticket.passes.map((pass) => (
                      <div key={pass.code} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <QRTicket
                          ticketCode={pass.code}
                          eventTitle={ticket.title}
                          hint={fill(t.myTickets.ticketNumber, {
                            n: String(pass.position),
                            total: String(ticket.quantity),
                          })}
                          caption={t.myTickets.showAtEntrance}
                          shareLabel={t.myTickets.share}
                          fileName={`${ticket.slug}-ticket-${pass.position}.png`}
                          used={Boolean(pass.checkedInAt)}
                          usedLabel={t.myTickets.used}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-24 items-center justify-center rounded-lg bg-gray-100 px-4 text-center text-sm text-gray-500">
                    {t.myTickets.pendingNoQr}
                  </div>
                )}
    </div>
  );
}
