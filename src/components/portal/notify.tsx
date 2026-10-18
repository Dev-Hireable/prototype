"use client";

import { toast as sonner } from "sonner";
import { ICONS } from "@/components/icons";
import type { PageToast } from "@/lib/portal/toast";

const TOAST_TONE = {
  success: { fill: "bg-[#e4f5ea]", icon: ICONS.checkCircle, ink: "text-ok" },
  danger: { fill: "bg-[#fcf2f2]", icon: ICONS.warning, ink: "text-danger" },
  info: { fill: "bg-[#ebf8fe]", icon: ICONS.info, ink: "text-primary" },
} as const;

/** The one thing a toast offers to do about what it says: Undo, Retry, Use mine. */
export type ToastAction = { label: string; onClick: () => void };

/**
 * The toast itself, drawn here rather than by a library's pill: a card in the tone's colour with its
 * icon and the message — wrapping onto more lines when it's long, never running past the edge — and
 * under it the action as a wide rounded button. The close is a small round button on the top-right
 * corner, there while the toast is hovered or focused (always on a touch screen, which can't hover).
 * A `danger` toast is an alert, announced at once; the rest are statuses.
 */
function ToastCard({ toast, action, onClose }: { toast: PageToast; action?: ToastAction; onClose: () => void }) {
  const t = TOAST_TONE[toast.tone];
  return (
    <div role={toast.tone === "danger" ? "alert" : "status"} className={`group/toast relative flex w-[var(--width)] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl px-3.5 py-3 font-sans shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] ${t.fill}`}>
      <div className="flex items-start gap-2.5">
        <t.icon size={20} aria-hidden className={`mt-px shrink-0 ${t.ink}`} />
        <p className="min-w-0 flex-1 py-px text-[14px] leading-[1.4] font-medium text-pretty text-ink">{toast.message}</p>
      </div>
      {action && (
        <button type="button" onClick={action.onClick} className="w-full rounded-full bg-white/70 px-5 py-2.5 text-[14px] leading-[1.2] font-semibold text-primary transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-white text-[#444] opacity-0 shadow-[0_1px_4px_rgba(0,0,0,0.15)] transition-[opacity,transform] duration-150 group-focus-within/toast:opacity-100 group-hover/toast:opacity-100 hover:scale-115 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary active:scale-95 [@media(hover:none)]:opacity-100 ${t.fill}`}
      >
        <ICONS.close size={12} aria-hidden />
      </button>
    </div>
  );
}

/**
 * Puts a toast up in the app's one Toaster (Sonner, @/components/portal/toaster) and returns its id.
 * Every toast is drawn here: a page's (`Toast`, which takes it down with the page) and one that must
 * outlive the control that raised it (`notify`) — a card unsaved off a Saved list is gone before its
 * toast is read. An action, or a `danger` tone, keeps it up longer so there's time to read and act;
 * hovering it holds the countdown (WCAG 2.2.1).
 */
export function raiseToast(toast: PageToast, action?: ToastAction, onClose?: (id: string | number) => void) {
  const id = sonner.custom(
    (id) => (
      <ToastCard
        toast={toast}
        action={action && { label: action.label, onClick: () => (action.onClick(), sonner.dismiss(id)) }}
        onClose={() => sonner.dismiss(id)}
      />
    ),
    {
      duration: action || toast.tone === "danger" ? 8000 : 3500,
      onDismiss: (t) => onClose?.(t.id),
      onAutoClose: (t) => onClose?.(t.id),
    },
  );
  return id;
}

/** Takes a toast down. */
export function dismissToast(id: string | number) {
  sonner.dismiss(id);
}

/** A toast for something done on the spot, with no page to hold it — a success unless a tone says otherwise. */
export function notify(message: string, tone: PageToast["tone"] = "success", action?: ToastAction) {
  raiseToast({ message, tone }, action);
}

/**
 * Save / unsave, said: "Maria Santos saved", or "… removed from saved" with Undo, which saves them
 * again — unsaving can take them off the list being looked at.
 */
export function toggleSavedWithNote(name: string, wasSaved: boolean, toggle: () => void) {
  toggle();
  if (wasSaved) notify(`${name} removed from saved`, "success", { label: "Undo", onClick: toggle });
  else notify(`${name} saved`);
}
