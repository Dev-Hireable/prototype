import { useState } from "react";
import type { DisputeParty } from "@/lib/demo/disputes";
import type { SetToast } from "@/lib/portal/toast";

/** Support's dialogs on a case; one is open at a time. */
export type Dialog = "ask" | "extend" | "reject" | "resolve" | "release";

/**
 * Which of support's dialogs is open, and what's been entered in it: the notes, the side asked or
 * ruled for, the days added. Closing any of them clears it all; `done` closes and toasts how the
 * move went.
 */
export function useSupportDialogs(onToast: SetToast) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notes, setNotes] = useState("");
  const [favor, setFavor] = useState<DisputeParty | null>(null);
  const [who, setWho] = useState<DisputeParty | null>(null);
  const [days, setDays] = useState(2);
  const close = () => {
    setDialog(null);
    setNotes("");
    setFavor(null);
    setWho(null);
    setDays(2);
  };
  const done = (r: { ok: boolean; error?: string }, message: string) => {
    close();
    onToast(r.ok ? message : (r.error ?? "That didn't work — try again."), r.ok ? "success" : "danger");
  };
  return { dialog, setDialog, notes, setNotes, favor, setFavor, who, setWho, days, setDays, close, done };
}

export type SupportDialogs = ReturnType<typeof useSupportDialogs>;
