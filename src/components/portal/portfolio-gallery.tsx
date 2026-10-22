"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { FilePreview } from "@/components/portal/file-preview";
import { Button, Modal } from "@/components/portal/ui";
import { sizeLabel, useFileUrl } from "@/lib/demo/files";
import type { Sample } from "@/lib/demo/portfolio";
import { closeAloneOnEscape } from "@/lib/portal/escape";

/** A sample's name: its caption, or else its place — never the file's own name, which can carry the talent's (#355). */
const titleOf = (s: Sample, i: number) => s.caption || `Work sample ${i + 1}`;

/** `at` moved `by` one, carrying on from the other end past either end. */
const stepped = (at: number, by: 1 | -1, count: number) => (at + by + count) % count;

/**
 * The Independent's work samples (#355, #311) as every view of the profile shows them, the talent's
 * own and each Team Builder's, before a hire and after it: a grid of 4:3 cards, each with its caption
 * under it (3 across in the profile's column, 2 where it's narrower, 1 on a phone), that open full
 * size with Previous / Next to step through the rest.
 */
export function PortfolioGallery({ samples }: { samples: Sample[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    // The viewer is portalled to <body>, but its keys still bubble up to here through React.
    <div className="@container/gallery" onKeyDown={(e) => open !== null && viewerKey(e, open, samples.length, setOpen)}>
      <ul aria-label="Work samples" className="grid grid-cols-1 gap-x-4 gap-y-6 @sm/gallery:grid-cols-2 @xl/gallery:grid-cols-3">
        {samples.map((s, i) => (
          <li key={s.id}>
            <SampleCard sample={s} title={titleOf(s, i)} onOpen={() => setOpen(i)} />
          </li>
        ))}
      </ul>
      <SampleViewer samples={samples} at={open} onAt={setOpen} />
    </div>
  );
}

/** The viewer's keys: ← and → step through the samples like Previous and Next, and Escape closes the viewer alone, even over a profile sheet. */
function viewerKey(e: KeyboardEvent, at: number, count: number, go: (at: number | null) => void) {
  if (e.defaultPrevented || closeAloneOnEscape(e, () => go(null))) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") go(stepped(at, e.key === "ArrowRight" ? 1 : -1, count));
}

/** A card in the grid: the sample's cover with its caption under it; the whole card opens it. */
function SampleCard({ sample, title, onOpen }: { sample: Sample; title: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Open ${title}`} className="group flex w-full flex-col gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-2 outline -outline-offset-1 outline-border transition group-hover:outline-[#a6a6a6]">
        <SampleCover sample={sample} />
      </span>
      {sample.caption && <span className="line-clamp-2 text-[14px] leading-[1.4] font-medium tracking-[0.2px] text-ink">{sample.caption}</span>}
    </button>
  );
}

/** What a card shows: the image itself, a PDF's mark and size, or that this browser doesn't have the file. */
function SampleCover({ sample }: { sample: Sample }) {
  const { url, missing } = useFileUrl(sample.id);
  if (missing) return <CoverNote icon={<ICONS.document size={28} aria-hidden />} text="Not in this browser" />;
  if (sample.type === "application/pdf") return <CoverNote icon={<ICONS.pdf size={32} aria-hidden className="text-danger" />} text={`PDF · ${sizeLabel(sample.size)}`} />;
  // eslint-disable-next-line @next/next/no-img-element -- a file kept in this browser, shown from an object URL
  return url ? <img src={url} alt="" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : null;
}

function CoverNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-[12px] leading-[1.2] font-medium tracking-[0.2px] text-ink-2">
      {icon}
      {text}
    </span>
  );
}

/** The open sample full size, in the same dialog as a dispute's files. */
function SampleViewer({ samples, at, onAt }: { samples: Sample[]; at: number | null; onAt: (at: number | null) => void }) {
  const sample = at === null ? undefined : samples[at];
  const title = sample && at !== null ? titleOf(sample, at) : "";
  return (
    <Modal open={!!sample} onClose={() => onAt(null)} title={title} width={960} closeButton>
      {sample && at !== null && <ViewerBody sample={sample} title={title} at={at} count={samples.length} onAt={onAt} />}
    </Modal>
  );
}

function ViewerBody({ sample, title, at, count, onAt }: { sample: Sample; title: string; at: number; count: number; onAt: (at: number) => void }) {
  const { url, missing } = useFileUrl(sample.id);
  return (
    <FilePreview url={url} type={sample.type} alt={title} missing={missing}>
      {count > 1 && <Stepper at={at} count={count} onAt={onAt} />}
    </FilePreview>
  );
}

/**
 * Previous and Next, with where this one is between them. Past either end they carry on from the
 * other, so neither is ever disabled under the focus.
 */
function Stepper({ at, count, onAt }: { at: number; count: number; onAt: (at: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button size="sm" onClick={() => onAt(stepped(at, -1, count))}>
        <ICONS.chevronLeft size={18} aria-hidden />
        Previous
      </Button>
      <span className="text-[13px] leading-[1.2] whitespace-nowrap text-ink-2">
        {at + 1} of {count}
      </span>
      <Button size="sm" onClick={() => onAt(stepped(at, 1, count))}>
        Next
        <ICONS.chevronRight size={18} aria-hidden />
      </Button>
    </div>
  );
}
