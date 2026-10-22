"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/portal/ui";
import { onWorkMessage, type WorkMessage } from "@/lib/work/store";

/**
 * What the work's actions have to say, wherever they're taken (the Work tab, or a dashboard's My
 * tasks): a toast for what matters, like a save that failed, with its Retry, and every outcome read
 * out. The announcer stays audible while an item's sheet is open: the modal hides the page but
 * keeps [aria-live].
 */
export function WorkMessages() {
  const { toast, closeToast, live } = useWorkMessages();
  return (
    <>
      <Toast toast={toast} action={toast?.action ? { label: toast.action.label, onClick: toast.action.run } : undefined} onClose={closeToast} />
      <p aria-live="polite" className="sr-only" data-testid="announcer">
        {live}
      </p>
    </>
  );
}

/** The latest message: as a toast unless it's only to be read out, and as the announcer's words. */
function useWorkMessages() {
  const [toast, setToast] = useState<WorkMessage | null>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const [live, setLive] = useState("");
  useEffect(
    () =>
      onWorkMessage((m) => {
        setLive(m.message);
        if (!m.quiet) setToast(m);
      }),
    [],
  );
  return { toast, closeToast, live };
}
