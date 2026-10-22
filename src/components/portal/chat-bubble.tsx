"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Tip } from "@/components/portal/tip";

const Check = ICONS.check;
const DoneAll = ICONS.doneAll;

/** TB-008 / IN-008 — your own message's receipt: delivered to the thread, or read by the other side. */
export type Receipt = "sent" | "seen";

/**
 * A text message in a conversation: yours in the blue bubble on the right, theirs in white on the
 * left, with the time (and on yours, the receipt) along its foot. Both inboxes and a proposal's
 * Activity pane draw their notes with it, so a message looks the same wherever it's read.
 * Long words wrap anywhere and typed line breaks are kept.
 *
 * The receipt is one tick when sent and two when seen. The seen ticks used to be `text-primary` —
 * the bubble's own blue — so a read message lost its tick instead of showing it.
 */
export function ChatBubble({ mine, time, receipt, header, className = "w-[420px]", children }: { mine: boolean; time: string; receipt?: Receipt; header?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1 px-3.5 py-2.5 text-[13px] leading-[1.45] whitespace-pre-wrap [overflow-wrap:anywhere] ${
        mine ? "rounded-tl-xl rounded-tr-xl rounded-br rounded-bl-xl bg-primary text-white" : "rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl bg-white text-ink-deep outline -outline-offset-1 outline-line"
      } ${className}`}
    >
      {header}
      {children}
      <p className={`flex items-center gap-1 self-end text-[10.5px] whitespace-nowrap ${mine ? "text-[#d9e8ff]" : "text-muted"}`}>
        {time}
        {mine && receipt && <ReceiptTick receipt={receipt} />}
      </p>
    </div>
  );
}

function ReceiptTick({ receipt }: { receipt: Receipt }) {
  const seen = receipt === "seen";
  const Icon = seen ? DoneAll : Check;
  return (
    <Tip label={seen ? "Seen" : "Sent"}>
      <span className="inline-flex" aria-label={seen ? "Seen" : "Sent"} role="img">
        <Icon size={16} aria-hidden className={seen ? "text-[#8fd3ff]" : "text-white/70"} />
      </span>
    </Tip>
  );
}
