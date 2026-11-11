"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useEffectEvent, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ICONS } from "@/components/icons";
import { ICON_BUTTON } from "@/components/kit/styles";

const NOOP_SUBSCRIBE = () => () => {};

const CLIENT_MOUNTED = () => true;

const SERVER_MOUNTED = () => false;

/**
 * The last few elements that had the focus, newest last: an opening Modal keeps them, as where to hand
 * the focus back when it closes. The opener itself may be gone by then — a menu item, whose menu closed
 * as it opened the dialog — so the focus goes to the latest one still on the page, the menu's button.
 */
const focusTrail: HTMLElement[] = [];

let trailing = false;

function trackFocus() {
  if (trailing) return;
  trailing = true;
  document.addEventListener("focusin", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    focusTrail.push(e.target);
    if (focusTrail.length > 8) focusTrail.shift();
  });
}

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, audio[controls], video[controls], [tabindex], [contenteditable="true"]';

/**
 * What Tab stops on inside `box`, in order: enabled and on screen, and not an item a roving group
 * (tabs, a toggle group) holds at tabindex -1. A video's controls count though its tabIndex may not say.
 */
export const tabStops = (box: HTMLElement) =>
  [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.matches(":disabled") && (el.tabIndex >= 0 || (el.matches("audio, video") && !el.hasAttribute("tabindex"))) && el.getClientRects().length > 0);

/** Tab and Shift+Tab go round the dialog's own controls instead of out to the page behind it. */
function keepTabInside(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Tab" || e.defaultPrevented) return;
  const box = e.currentTarget;
  const stops = tabStops(box);
  const first = stops[0];
  const last = stops.at(-1);
  if (!first || !last) return e.preventDefault();
  const at = document.activeElement;
  if (e.shiftKey ? at === first || at === box : at === last) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

/** The dialogs open now, in the order they opened: the last is the one on top. */
const openDialogs: symbol[] = [];

/**
 * Escape closes the dialog while it's open — only the top one, with one open over another — unless a
 * popup inside it claimed the key first.
 */
function useCloseOnEscape(open: boolean, onClose: () => void) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!open) return;
    const me = Symbol("dialog");
    openDialogs.push(me);
    // A popup inside the dialog (a Select menu, the date picker) claims Escape with preventDefault;
    // it closes that popup, not the whole dialog. Every open dialog listens, so the top one claims
    // the key as it closes: one Escape used to close the whole stack.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || openDialogs.at(-1) !== me) return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openDialogs.splice(openDialogs.indexOf(me), 1);
    };
  }, [open]);
}

/**
 * The way back of a dialog that has just closed, for one opening in its place in the same update:
 * Review proposal gives way to Decline, and Decline back to the review. Each takes the first one's way
 * back rather than the trail's, which by then holds only the dialogs' own controls — a long enough
 * round trip had pushed the opener off it, and closing the review left the focus on <body>.
 */
let handedOver: HTMLElement[] | null = null;

/**
 * Where the focus can go back to when the dialog in `box` closes, best last. What has the focus as it
 * opens, if that's outside it, is its opener: last, after the trail. With the focus on <body> (the
 * dialog this one replaces took it along) or already inside it (autoFocus), it's the way back of a
 * dialog that has just closed in its place, or else the trail. Opened from inside another dialog, it
 * goes back there.
 */
function wayBack(box: HTMLElement) {
  const at = document.activeElement;
  const opener = at instanceof HTMLElement && at !== document.body && !box.contains(at) ? at : null;
  if (!opener && handedOver) return handedOver;
  const trail = focusTrail.filter((el) => !box.contains(el) && el !== opener);
  return opener ? [...trail, opener] : trail;
}

/**
 * The focus while the dialog is open: it moves in on opening, and on closing goes back to what opened
 * it, or else the latest element before that which is still on the page. Returns the ref for the
 * dialog's panel.
 */
function useFocusInside(open: boolean, mounted: boolean) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = panel.current;
    if (!open || !mounted || !box) return;
    // Kept as it opens: tabbing round the dialog moves the trail on.
    const back = wayBack(box);
    // Opening takes the focus into the dialog, unless a field inside already has it (autoFocus).
    if (!box.contains(document.activeElement)) box.focus({ preventScroll: true });
    return () => {
      // For a dialog that opens in this one's place, in this same update.
      handedOver = back;
      // Closing drops the focus on <body> with the dialog: hand it back to the page. Checked a tick
      // later, so Strict Mode's rehearsal unmount (the dialog stays, and keeps the focus) and a dialog
      // opening in this one's place (it has the focus by then) leave it where it is.
      queueMicrotask(() => {
        handedOver = null;
        if (document.activeElement && document.activeElement !== document.body) return;
        back.findLast((el) => el.isConnected && el !== document.body)?.focus({ preventScroll: true });
      });
    };
  }, [open, mounted]);
  return panel;
}

/** A dialog: its title (always its accessible name) and description, its content and footer, and its look. */
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
  width?: number;
  /** A × in the title row. Danger dialogs always have one; others opt in. */
  closeButton?: boolean;
  /** Hand the whole panel to `children`: no padding, no title row, no footer row. For designs
   * that own their chrome — a header bar, panes that reach the edges, a footer of their own. */
  bare?: boolean;
};

export function Modal({ open, onClose, title, description, children, footer, tone = "default", width = 512, bare = false, closeButton = false }: ModalProps) {
  const id = useId();
  const X = ICONS.close;
  const mounted = useSyncExternalStore(NOOP_SUBSCRIBE, CLIENT_MOUNTED, SERVER_MOUNTED);
  useEffect(trackFocus, []);
  useCloseOnEscape(open, onClose);
  const panel = useFocusInside(open, mounted);
  if (!open || !mounted || typeof document === "undefined") return null;
  // Portalled to <body>: page content sits inside ScrollFade's `isolate`, which would otherwise
  // trap this overlay in a stacking context that the shell's sidebar paints over.
  // On a phone it's a sheet on the bottom edge, its buttons full width under the thumb, the main
  // one on top and Cancel below it, the way a phone's own action sheets are.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 max-md:items-end max-md:p-0" onClick={onClose}>
      {/* Not a native <dialog>: showModal() makes everything outside it inert, and the Select menus
          and date pickers inside portal to <body>. The focus is kept inside by hand instead. */}
      {/* react-doctor-disable-next-line react-doctor/prefer-html-dialog */}
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={keepTabInside}
        className={`ui-zoom relative flex max-h-[calc(90vh/var(--ui-scale))] w-full flex-col rounded-xl bg-white outline-none max-md:max-h-[92dvh] max-md:rounded-b-none max-md:rounded-t-2xl ${bare ? "overflow-hidden max-md:pb-[env(safe-area-inset-bottom)]" : "gap-5 overflow-y-auto p-6 max-md:px-4 max-md:pt-5 max-md:pb-[calc(1rem+env(safe-area-inset-bottom))]"}`}
        style={{ maxWidth: width }}
      >
        {bare ? (
          <>
            <h2 id={id} className="sr-only">
              {title}
            </h2>
            {children}
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <ModalHeading id={id} title={title} description={description} danger={tone === "danger"} />
              {(tone === "danger" || closeButton) && (
                <button type="button" onClick={onClose} aria-label="Close" className={`${ICON_BUTTON} -m-1.5 size-8`}>
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
            {children}
            {footer && <div className="flex justify-end gap-3 max-md:flex-col-reverse max-md:*:w-full">{footer}</div>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** The short list a dialog gives of what its action does: what's paid, who's told, what can't be undone. */
export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.4] text-ink-2">{children}</ul>;
}

/** The title row's words: a warning mark on a danger dialog, then the title — the dialog's name, `id` — and its description. */
function ModalHeading({ id, title, description, danger }: { id: string; title: string; description?: ReactNode; danger: boolean }) {
  const W = ICONS.warning;
  return (
    <>
      {danger && (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
          <W size={14} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-[20px] leading-[1.4] font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-[14px] leading-[1.4] text-ink-2">{description}</p>}
      </div>
    </>
  );
}
