"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";

/** The box a file opens in: most of the window's height, so a viewer's controls stay put from one file to the next. */
const BOX = "h-[calc(70vh/var(--ui-scale))] w-full rounded-lg bg-surface-2";

/**
 * A kept file shown full size in a dialog: an image fitted to the box, a PDF in the browser's own
 * viewer, with a link under it that opens the file in a tab of its own. `children` sit at the other
 * end of that row: a gallery's Previous / Next. The box holds its place while the file loads (`url`
 * null) or when this browser doesn't have it, so nothing under it moves. Dispute attachments and
 * portfolio samples open in it.
 */
export function FilePreview({ url, type, alt, missing = false, children }: { url: string | null; type: string; alt: string; missing?: boolean; children?: ReactNode }) {
  const pdf = type === "application/pdf";
  return (
    <div className="flex flex-col gap-3">
      <Shown url={url} pdf={pdf} alt={alt} missing={missing} />
      <div className="flex min-h-8 flex-wrap items-center gap-3">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            {pdf ? "Open the PDF" : "Open full size"} <ICONS.northEast size={16} aria-hidden />
          </a>
        )}
        {children && <div className="ml-auto">{children}</div>}
      </div>
    </div>
  );
}

/** The file itself in the box, or the box holding its place. */
function Shown({ url, pdf, alt, missing }: { url: string | null; pdf: boolean; alt: string; missing: boolean }) {
  if (missing) return <p className={`${BOX} flex items-center justify-center p-6 text-center text-[14px] leading-[1.4] text-ink-2`}>This file isn&apos;t in this browser.</p>;
  if (!url) return <div className={BOX} />;
  if (pdf) return <object data={url} type="application/pdf" aria-label={alt} className={BOX} />;
  // eslint-disable-next-line @next/next/no-img-element -- a file kept in this browser, shown from an object URL
  return <img src={url} alt={alt} className={`${BOX} object-contain`} />;
}
