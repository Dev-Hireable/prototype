"use client";

import { useRef, useState, type DragEvent, type Ref } from "react";
import type { IconType } from "react-icons";
import { ICONS } from "@/components/icons";
import { Helper } from "@/components/independent/profile-editors";
import { EditPanel } from "@/components/portal/inline-edit";
import { ICON_BUTTON } from "@/components/portal/styles";
import { Tip } from "@/components/portal/tip";
import { Input } from "@/components/portal/ui";
import { sizeLabel, useFileUrl, usePreviewUrl } from "@/lib/demo/files";
import { CAPTION_MAX, MAX_SAMPLE_MB, MAX_SAMPLES, SAMPLE_TYPES, type DraftSample, type Sample } from "@/lib/demo/portfolio";
import { useSampleDrafts } from "@/lib/independent/portfolio";
import type { SetToast } from "@/lib/portal/toast";

type Drafts = ReturnType<typeof useSampleDrafts>;

/**
 * The work samples Team Builders see before they hire (#355, #311), edited in place like the rest of
 * the profile: images and PDFs picked or dropped in, each captioned, put in order by dragging or with
 * the arrows, and taken off with ✕. Nothing is kept until Save, and Cancel leaves them as they were.
 */
export function SamplesEditor({ samples, onSaved, onCancel, onMessage }: { samples: Sample[]; onSaved: () => void; onCancel: () => void; onMessage: SetToast }) {
  const drafts = useSampleDrafts(samples, onMessage);
  const drop = useFileDrop(drafts.add);
  return (
    <EditPanel label="Work samples" canSave={!drafts.busy} saveTip="Saving your work samples…" onCancel={onCancel} onSave={() => void drafts.save().then((ok) => ok && onSaved())}>
      {/* Files dropped anywhere in here are added, rather than opened by the browser in place of the page. */}
      <div {...drop.handlers} className="flex flex-col gap-4">
        {drafts.items.length > 0 && <DraftList drafts={drafts} />}
        <AddSamples count={drafts.items.length} over={drop.over} onFiles={drafts.add} />
      </div>
    </EditPanel>
  );
}

/** Files dragged over the editor: whether some are over it now, and the handlers that take them in. */
function useFileDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  const carriesFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  return {
    over,
    handlers: {
      onDragOver: (e: DragEvent) => {
        if (!carriesFiles(e)) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      },
      onDrop: (e: DragEvent) => {
        if (!carriesFiles(e)) return;
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      },
    },
  };
}

/** The samples in their order. A row is dragged by its grip, and the others part where it would land. */
function DraftList({ drafts }: { drafts: Drafts }) {
  const [dragging, setDragging] = useState<number | null>(null);
  /** A row dragged over another takes its place there and then. */
  const over = (e: DragEvent, at: number) => {
    if (dragging === null) return;
    e.preventDefault();
    if (dragging === at) return;
    drafts.move(dragging, at);
    setDragging(at);
  };
  return (
    <ol aria-label="Your work samples" className="flex flex-col gap-2">
      {drafts.items.map((d, i) => (
        <li key={d.key} onDragOver={(e) => over(e, i)} onDrop={(e) => dragging !== null && e.preventDefault()} className={dragging === i ? "opacity-50" : undefined}>
          <DraftRow draft={d} at={i} count={drafts.items.length} drafts={drafts} onGrab={() => setDragging(i)} onLetGo={() => setDragging(null)} />
        </li>
      ))}
    </ol>
  );
}

/** A row taken by its grip: the whole row is what's seen being dragged. */
function grab(e: DragEvent, key: string, onGrab: () => void) {
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", key);
  const row = e.currentTarget.closest("li");
  if (row) e.dataTransfer.setDragImage(row, 16, 24);
  onGrab();
}

/** One sample: its grip and a small preview, its file's name and size over its caption, then the arrows and ✕. */
function DraftRow({ draft, at, count, drafts, onGrab, onLetGo }: { draft: DraftSample; at: number; count: number; drafts: Drafts; onGrab: () => void; onLetGo: () => void }) {
  const file = draft.sample ? draft.sample : draft.file;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white py-2 pr-2 pl-1 outline -outline-offset-1 outline-border">
      {/* For the mouse: the keyboard moves a sample with the arrows. */}
      <span draggable aria-hidden onDragStart={(e) => grab(e, draft.key, onGrab)} onDragEnd={onLetGo} className="flex h-11 w-5 shrink-0 cursor-grab items-center justify-center text-ink-2 active:cursor-grabbing">
        <ICONS.drag size={18} />
      </span>
      {draft.sample ? <SavedThumb sample={draft.sample} /> : <PickedThumb file={draft.file} />}
      <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
        <span className="truncate text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
          {file.name} · {sizeLabel(file.size)}
        </span>
        <Input aria-label={`Caption for ${file.name}`} value={draft.caption} maxLength={CAPTION_MAX} placeholder="A caption, like Kalye Coffee rebrand" onChange={(e) => drafts.caption(draft.key, e.target.value)} />
      </div>
      <RowActions name={file.name} at={at} count={count} onMove={drafts.move} onRemove={() => drafts.remove(draft.key)} />
    </div>
  );
}

/**
 * The arrows and ✕ at a row's end. The focus stays with the sample as it moves, on the other arrow
 * once it reaches an end, so an arrow can be pressed again and again.
 */
function RowActions({ name, at, count, onMove, onRemove }: { name: string; at: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void }) {
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  const move = (by: 1 | -1) => {
    const to = at + by;
    onMove(at, to);
    const canGoOn = by < 0 ? to > 0 : to < count - 1;
    requestAnimationFrame(() => ((by < 0) === canGoOn ? up : down).current?.focus());
  };
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <IconAction ref={up} icon={ICONS.arrowUp} label={`Move ${name} up`} tip={at === 0 ? "Already at the top" : "Move up"} disabled={at === 0} onClick={() => move(-1)} />
      <IconAction ref={down} icon={ICONS.arrowDown} label={`Move ${name} down`} tip={at === count - 1 ? "Already at the bottom" : "Move down"} disabled={at === count - 1} onClick={() => move(1)} />
      <IconAction icon={ICONS.close} label={`Remove ${name}`} tip="Remove" onClick={onRemove} />
    </div>
  );
}

function IconAction({ ref, icon: Icon, label, tip, disabled = false, onClick }: { ref?: Ref<HTMLButtonElement>; icon: IconType; label: string; tip: string; disabled?: boolean; onClick: () => void }) {
  return (
    <Tip label={tip} wrap={disabled}>
      <button ref={ref} type="button" aria-label={label} disabled={disabled} onClick={onClick} className={`${ICON_BUTTON} size-8 disabled:opacity-40`}>
        <Icon size={18} aria-hidden />
      </button>
    </Tip>
  );
}

function SavedThumb({ sample }: { sample: Sample }) {
  const { url } = useFileUrl(sample.id);
  return <Thumb url={url} pdf={sample.type === "application/pdf"} />;
}

function PickedThumb({ file }: { file: File }) {
  const pdf = file.type === "application/pdf";
  const url = usePreviewUrl(pdf ? null : file);
  return <Thumb url={url} pdf={pdf} />;
}

/** A row's small 4:3 preview: the image, saved or just picked, or a PDF's mark. */
function Thumb({ url, pdf }: { url: string | null; pdf: boolean }) {
  return (
    <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2 outline -outline-offset-1 outline-border">
      {pdf ? (
        <ICONS.pdf size={22} aria-hidden className="text-danger" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a file in this browser, shown from an object URL
        url && <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}

/** Where samples come in: a dashed box that picks files (they can be dropped on the editor too), then what it takes and how many are in. */
function AddSamples({ count, over, onFiles }: { count: number; over: boolean; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const full = count >= MAX_SAMPLES;
  return (
    <div className="flex flex-col gap-2">
      <Tip label={full ? "Remove a sample to add another" : undefined} wrap={full} wrapClassName="w-full">
        <button
          type="button"
          disabled={full}
          onClick={() => input.current?.click()}
          className={`flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${over && !full ? "border-primary bg-accent-bg" : "border-border bg-white enabled:hover:border-primary"}`}
        >
          <span className="flex items-center gap-1.5 text-[14px] leading-[1.2] font-medium text-primary">
            <ICONS.add size={20} aria-hidden />
            Add work samples
          </span>
          <span className="text-[12px] leading-[1.4] text-ink-2">{full ? `All ${MAX_SAMPLES} are in` : "Choose images or PDFs, or drop them here"}</span>
        </button>
      </Tip>
      <input
        ref={input}
        type="file"
        multiple
        accept={SAMPLE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <Helper left={`PNG, JPG, WebP, GIF or PDF, up to ${MAX_SAMPLE_MB}MB each`} right={`${count} / ${MAX_SAMPLES}`} />
    </div>
  );
}
