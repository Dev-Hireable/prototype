"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useHydrated } from "@/lib/demo/deal";
import { recordTour, tourRecord } from "@/lib/demo/tours";
import { onTourPath, sideOf, tourById, tourFor, type Tour, type TourSide } from "@/lib/portal/tours";
import { findTarget } from "@/lib/portal/tour-placement";
import { TourOverlay } from "./tour-overlay";

/** How long a screen gets to draw its content before its tour starts on it. */
const SETTLE_MS = 600;

type Running = { tour: Tour; step: number };

/** What the "?" needs from the provider: whose portal this is, which screen, and a way to start a tour. */
type TourMenu = { side: TourSide; pathname: string; start: (id: string, step?: number) => void };
const TourContext = createContext<TourMenu | null>(null);

/** The tour menu's wiring, or null outside the two portals: Admin has no tours. */
export const useTourMenu = () => useContext(TourContext);

/**
 * The guided tours in a portal (@/lib/portal/tours): a screen's tour starts on its own the first
 * time it opens, and the "?" in the sidebar (TourHelp) starts, resumes or restarts one any time.
 * Finishing or skipping puts it on record (@/lib/demo/tours) so it doesn't start by itself again.
 * A tour that's open when its screen is left counts as skipped there, so it can be resumed.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const side = sideOf(pathname);
  /** A tour asked for on another screen: it starts once that screen is open. */
  const queued = useRef<{ id: string; step: number } | null>(null);
  /** Where the keyboard was before the tour took it, so it goes back there afterwards. */
  const returnFocus = useRef<HTMLElement | null>(null);
  const [running, setRunning] = useAutoStart({ pathname, hydrated, queued });

  const close = (record: "done" | "skipped", run: Running) => {
    recordTour(run.tour.id, { status: record, step: run.step });
    setRunning(null);
    // Started from the help menu, the button pressed has gone with the menu: Help itself takes it back.
    const back = returnFocus.current?.isConnected ? returnFocus.current : findTarget('[data-tour="help"]');
    back?.focus({ preventScroll: true });
  };
  const start = useCallback(
    (id: string, step = 0) => {
      const tour = tourById(id);
      if (!tour) return;
      returnFocus.current = document.activeElement as HTMLElement | null;
      if (onTourPath(tour.path, pathname)) return setRunning({ tour, step });
      // One screen of many (a contract) can only be toured from that screen: there is no one place to go.
      if (tour.path.includes("[")) return;
      queued.current = { id, step };
      router.push(tour.path);
    },
    [pathname, router, setRunning],
  );
  const menu = useMemo(() => (side ? { side, pathname, start } : null), [side, pathname, start]);

  return (
    <TourContext.Provider value={menu}>
      {children}
      {running && onTourPath(running.tour.path, pathname) && <RunningTour run={running} onStep={(step) => setRunning({ ...running, step })} onClose={(record) => close(record, running)} onGo={(href) => router.push(href)} />}
    </TourContext.Provider>
  );
}

/** The open tour's overlay, wired to step through it, close it, and follow its last step's action. */
function RunningTour({ run, onStep, onClose, onGo }: { run: Running; onStep: (step: number) => void; onClose: (record: "done" | "skipped") => void; onGo: (href: string) => void }) {
  const last = run.step === run.tour.steps.length - 1;
  const action = run.tour.steps[run.step].action;
  return (
    <TourOverlay
      tour={run.tour}
      step={run.step}
      onBack={() => onStep(Math.max(0, run.step - 1))}
      onNext={() => (last ? onClose("done") : onStep(run.step + 1))}
      onSkip={() => onClose("skipped")}
      onAction={() => {
        onClose("done");
        if (action) onGo(action.href);
      }}
    />
  );
}

type AutoStart = {
  pathname: string;
  hydrated: boolean;
  queued: RefObject<{ id: string; step: number } | null>;
};

/** A sheet or modal over the screen (an item a notification opened, say), other than the tour's own card. */
const MODAL = '[data-slot="sheet-content"], [role="dialog"][aria-modal="true"], [role="alertdialog"]';
const modalOpen = () => [...document.querySelectorAll(MODAL)].some((el) => !el.closest("[data-tour-overlay]"));

/**
 * Starts a tour once a screen has settled: the one asked for from another screen, or else this
 * screen's own the first time it opens. A tour left open on the screen before is recorded as
 * skipped where it stopped. While a sheet or modal is up the tour waits for it to close: what's
 * behind it is dimmed and blurred, so there'd be nothing to point at. It holds the open tour.
 */
function useAutoStart({ pathname, hydrated, queued }: AutoStart) {
  const [running, setRunning] = useState<Running | null>(null);
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    if (!hydrated) return;
    const left = runningRef.current;
    if (left && !onTourPath(left.tour.path, pathname)) recordTour(left.tour.id, { status: "skipped", step: left.step });
    const begin = () => {
      const ask = queued.current;
      queued.current = null;
      const asked = ask && tourById(ask.id);
      if (ask && asked && onTourPath(asked.path, pathname)) return setRunning({ tour: asked, step: ask.step });
      const open = runningRef.current;
      if (open && onTourPath(open.tour.path, pathname)) return;
      const here = tourFor(pathname);
      setRunning(here && !tourRecord(here.id) ? { tour: here, step: 0 } : null);
    };
    let timer = 0;
    // Watched only while a sheet is up: once it's gone the screen settles again, then the tour starts.
    const observer = new MutationObserver(() => {
      if (modalOpen()) return;
      observer.disconnect();
      settle();
    });
    const settle = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => (modalOpen() ? observer.observe(document.body, { childList: true, subtree: true }) : begin()), SETTLE_MS);
    };
    settle();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname, hydrated, queued]);
  return [running, setRunning] as const;
}
