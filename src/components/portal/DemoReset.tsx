"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { MdRestartAlt } from "react-icons/md";
import { Button, Modal } from "@/components/independent/ui";
import { resetDemo } from "@/lib/demo/live";

const PORTALS = ["/team", "/independent", "/admin"];

/**
 * Reset demo, pinned to the top-right corner of every screen. It used to sit in the Notifications
 * toolbar, a screen away from wherever the demo had got messy.
 *
 * It's fixed, so it takes no room in any layout and never moves: the page headers it floats over
 * end short of it instead (CLEAR_DEMO_RESET). 20px in from the top and right is where those
 * headers' own controls start, so it lines up with the offer screens' × and Admin's header
 * buttons. z-40 keeps dialogs and toasts (z-50) above it.
 */
export function DemoReset() {
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);
  // Lands on the portal's dashboard: the record page it was pressed on may not exist in the starting data.
  const home = PORTALS.find((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="fixed top-5 right-5 z-40 flex h-6 items-center gap-1 rounded-full border border-border bg-white pr-2.5 pl-2 text-[12px] leading-none font-medium whitespace-nowrap text-ink-2 hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <MdRestartAlt size={14} aria-hidden />
        Reset demo
      </button>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        tone="danger"
        title="Reset the demo?"
        description="This clears everything the demo has saved in this browser — new accounts, roles, applications, messages and notifications — and puts every portal back to its starting data."
        footer={
          <>
            <Button size="lg" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" onClick={() => resetDemo(home)}>
              Reset demo
            </Button>
          </>
        }
      />
    </>
  );
}
