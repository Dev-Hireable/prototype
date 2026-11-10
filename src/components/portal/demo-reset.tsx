"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Button, Modal } from "@/components/portal/ui";
import { resetDemo } from "@/lib/demo/live";

const PORTALS = ["/team", "/independent", "/admin"];

/** The portal `pathname` is in, or undefined (sign-in, onboarding). */
const portalOf = (pathname: string) => PORTALS.find((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * The fixed right-edge tab stays out of the page header. On phones, the portal Menu holds Reset
 * demo, while sign-in and onboarding keep the tab.
 */
export function DemoReset() {
  const inPortal = !!portalOf(usePathname());
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`hit-area fixed top-1/2 right-0 z-40 flex w-8 -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-lg border border-r-0 border-border bg-white py-2.5 text-xs leading-none font-medium whitespace-nowrap text-ink-2 hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${inPortal ? "max-md:hidden" : ""}`}
      >
        <ICONS.restart size={16} aria-hidden />
        <span className="[writing-mode:vertical-rl]">Reset demo</span>
      </button>
      <ResetDemoDialog open={confirming} onClose={() => setConfirming(false)} />
    </>
  );
}

/** Reset's confirm: clears what the demo saved and lands on the portal's dashboard. */
export function ResetDemoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Lands on the portal's dashboard: the record page it was pressed on may not exist in the starting data.
  const home = portalOf(usePathname());
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title="Reset the demo?"
      description="This clears everything the demo has saved in this browser (new accounts, roles, applications, messages and notifications) and puts every portal back to its starting data."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={() => resetDemo(home)}>
            Reset demo
          </Button>
        </>
      }
    />
  );
}
