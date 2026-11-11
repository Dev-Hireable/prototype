import { TRAY, TRAY_PANEL } from "@/components/kit/styles";
import type { WorkItem } from "@/lib/work/model";

/**
 * The shared card tray holds the view controls. Its inset panel scrolls independently so sticky
 * headings and columns stay inside the rounded corners.
 */
export const VIEW_FRAME = `flex min-h-0 flex-col ${TRAY}`;
export const VIEW_BODY = `relative min-h-0 min-w-0 overflow-auto ${TRAY_PANEL}`;
export const VIEW_CONTROLS = "flex shrink-0 flex-wrap items-center gap-2 px-3 py-2";

export const WORK_STATUS_SURFACE: Record<WorkItem["status"], string> = {
  todo: "bg-surface-2 text-ink",
  doing: "bg-accent-bg text-accent-ink",
  review: "bg-[#fff3cc] text-[#6b5208]",
  done: "bg-[#e3f6ea] text-ok-ink",
};

const DATE_CONTROL = "inline-flex h-9 shrink-0 items-center justify-center rounded-lg text-ink-2 enabled:hover:bg-white enabled:hover:text-ink focus-visible:outline-2 focus-visible:outline-primary max-md:h-10";
export const TODAY_BUTTON = `${DATE_CONTROL} px-3 text-[13px] font-medium whitespace-nowrap disabled:opacity-60`;
export const STEP_BUTTON = `${DATE_CONTROL} w-9 max-md:w-10`;
