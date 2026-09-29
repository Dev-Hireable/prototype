"use client";

import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Modal } from "@/components/portal/ui";

const Mic = ICONS.call;
const Close = ICONS.close;

/**
 * IN-011 — the in-call surface: who is on the call, and mute / camera / end call.
 *
 * The link alone satisfied "a call starts and the other side is told", but the acceptance
 * criteria also ask for the controls, and there was nothing to control. No real media here —
 * the toggles are the session state a prototype can honestly show, and the link stays in the
 * thread for anyone who wants to open the real meeting.
 */
export function CallDialog({ open, link, withWhom, onEnd }: { open: boolean; link: string | null; withWhom: string; onEnd: () => void }) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  return (
    <Modal open={open && !!link} onClose={onEnd} title={`Call with ${withWhom}`} width={420} bare>
      <div className="flex flex-col">
        <div className="flex flex-col items-center gap-2 bg-ink px-6 py-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-[22px] font-semibold text-white">{withWhom.slice(0, 1)}</span>
          <p className="text-[16px] leading-[1.4] font-semibold text-white">{withWhom}</p>
          <p className="text-[13px] leading-[1.4] text-white/70">{cameraOff ? "Camera off" : "Camera on"} · {muted ? "Microphone muted" : "Microphone live"}</p>
          <p className="mt-1 text-[11.5px] leading-[1.4] text-white/50">{link}</p>
        </div>

        <div className="flex items-center justify-center gap-3 p-4">
          <button
            type="button"
            aria-pressed={muted}
            onClick={() => setMuted((m) => !m)}
            className={`flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] leading-[1.2] font-medium ${muted ? "bg-ink text-white" : "border border-border bg-white text-ink hover:bg-surface-alt"}`}
          >
            <Mic size={18} aria-hidden /> {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            aria-pressed={cameraOff}
            onClick={() => setCameraOff((c) => !c)}
            className={`flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] leading-[1.2] font-medium ${cameraOff ? "bg-ink text-white" : "border border-border bg-white text-ink hover:bg-surface-alt"}`}
          >
            {cameraOff ? "Camera on" : "Camera off"}
          </button>
          <button type="button" onClick={onEnd} className="flex h-11 items-center gap-2 rounded-lg bg-danger px-4 text-[14px] leading-[1.2] font-medium text-white hover:bg-danger-hover">
            <Close size={18} aria-hidden /> End call
          </button>
        </div>
      </div>
    </Modal>
  );
}
