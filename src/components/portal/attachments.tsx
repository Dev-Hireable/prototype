"use client";

import { useRef, useState } from "react";
import { ICONS, type IconName } from "@/components/icons";
import { FilePreview } from "@/components/portal/file-preview";
import { ICON_BUTTON } from "@/components/portal/styles";
import { Tip } from "@/components/portal/tip";
import { Modal } from "@/components/portal/ui";
import { fileKind, SHARED_FILE_ACCEPT, sizeLabel, useFileUrl, usePreviewUrl, type FileKind } from "@/lib/demo/files";
import type { Attachment } from "@/lib/disputes/case";
import { closeAloneOnEscape } from "@/lib/portal/escape";
import { keyed } from "@/lib/portal/keys";

/**
 * Files sent with a comment, a chat message or a dispute's reply, drawn one way wherever they're
 * read: an image as a thumbnail that opens full size, a PDF as a card that opens in the viewer, and a
 * Word, Excel or PowerPoint document (or any other file) as a card that downloads it.
 */

/** Each kind of file's icon, on its own tint, so a document reads at a glance before its name does. */
const KIND: Record<FileKind, { icon: IconName; tint: string }> = {
  image: { icon: "fileImage", tint: "bg-[#f3effc] text-[#6b4fbb]" },
  pdf: { icon: "pdf", tint: "bg-[#fdf2f2] text-danger" },
  doc: { icon: "document", tint: "bg-[#eef3fb] text-[#2b579a]" },
  sheet: { icon: "fileSheet", tint: "bg-[#edf7f1] text-[#217346]" },
  slides: { icon: "fileSlides", tint: "bg-[#fdf1ec] text-[#c43e1c]" },
  text: { icon: "fileText", tint: "bg-surface-2 text-ink-2" },
  file: { icon: "file", tint: "bg-surface-2 text-ink-2" },
};

function KindIcon({ kind, size = "md" }: { kind: FileKind; size?: "sm" | "md" }) {
  const Icon = ICONS[KIND[kind].icon];
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-lg ${KIND[kind].tint} ${size === "sm" ? "size-8" : "size-9"}`}>
      <Icon size={size === "sm" ? 18 : 20} />
    </span>
  );
}

/** The paperclip: picks one or more files to go with what's being written. */
export function AttachButton({ onPick }: { onPick: (files: FileList | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept={SHARED_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
      <Tip label="Attach files">
        <button type="button" aria-label="Attach files" onClick={() => input.current?.click()} className={`${ICON_BUTTON} size-8`}>
          <ICONS.attach size={20} aria-hidden />
        </button>
      </Tip>
    </>
  );
}

/** The files waiting to go with the next send, above the text: a thumbnail or a card each, with × to take it off. */
export function PendingFiles({ files, onRemove }: { files: readonly File[]; onRemove: (file: File) => void }) {
  return (
    <ul aria-label="Files to send" className="flex flex-wrap gap-2">
      {keyed(files, (f) => `${f.name}-${f.size}-${f.lastModified}`).map(({ item: f, key }) => (
        <li key={key} className="relative">
          <PendingFile file={f} />
          <button type="button" onClick={() => onRemove(f)} aria-label={`Remove ${f.name}`} className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white shadow hover:bg-ink-deep focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary">
            <ICONS.close size={12} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function PendingFile({ file }: { file: File }) {
  const kind = fileKind(file);
  const url = usePreviewUrl(kind === "image" ? file : null);
  if (kind === "image")
    return (
      <span className="block size-14 overflow-hidden rounded-lg bg-surface-2 outline -outline-offset-1 outline-border">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file that isn't saved anywhere yet */}
        {url && <img src={url} alt={file.name} className="size-full object-cover" />}
      </span>
    );
  return (
    <span className="flex h-14 w-52 max-w-full items-center gap-2 rounded-lg bg-white px-2 outline -outline-offset-1 outline-border">
      <KindIcon kind={kind} size="sm" />
      <span className="flex min-w-0 flex-col text-[12px] leading-[1.35]">
        <span className="truncate font-medium text-ink">{file.name}</span>
        <span className="text-ink-2">{sizeLabel(file.size)}</span>
      </span>
    </span>
  );
}

/** Files sent: image thumbnails first, then the documents' cards. */
export function FileTiles({ files }: { files: readonly Attachment[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Attachments">
      {files.map((f) => (
        <li key={f.id} className="min-w-0">
          <FileTile file={f} />
        </li>
      ))}
    </ul>
  );
}

/** One sent file, as its kind is read: an image or a PDF opens in the viewer, anything else downloads. */
function FileTile({ file }: { file: Attachment }) {
  const { url, missing } = useFileUrl(file.id);
  const [open, setOpen] = useState(false);
  const kind = fileKind(file);
  const label = `${file.name} · ${sizeLabel(file.size)}`;
  if (missing)
    return (
      <span className="flex h-10 items-center gap-2 rounded-lg bg-surface-2 px-3 text-[12.5px] text-ink-2">
        <ICONS.document size={16} aria-hidden /> {file.name} (not in this browser)
      </span>
    );
  if (kind !== "image" && kind !== "pdf") return <DownloadCard file={file} kind={kind} url={url} label={label} />;
  return (
    // Escape closes the viewer alone, not the task sheet or the chat it was opened from.
    <div className="contents" onKeyDown={(e) => open && closeAloneOnEscape(e, () => setOpen(false))}>
      {kind === "image" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={`Open ${label}`} className="block size-24 overflow-hidden rounded-lg bg-surface-2 outline -outline-offset-1 outline-border hover:outline-[#a6a6a6] focus-visible:outline-2 focus-visible:outline-primary">
          {/* eslint-disable-next-line @next/next/no-img-element -- a file kept in this browser, shown from an object URL */}
          {url && <img src={url} alt={file.name} className="size-full object-cover" />}
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-label={`Open ${label}`} className={CARD}>
          <CardFace file={file} kind={kind} />
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={file.name} width={960} closeButton>
        <FilePreview url={url} type={file.type} alt={file.name} />
      </Modal>
    </div>
  );
}

const CARD = "flex h-14 w-60 max-w-full items-center gap-2.5 rounded-lg bg-white px-2.5 text-left outline -outline-offset-1 outline-border hover:outline-[#a6a6a6] focus-visible:outline-2 focus-visible:outline-primary";

/** A document the browser can't show: its card downloads it. */
function DownloadCard({ file, kind, url, label }: { file: Attachment; kind: FileKind; url: string | null; label: string }) {
  return (
    <a href={url ?? undefined} download={file.name} aria-label={`Download ${label}`} className={CARD}>
      <CardFace file={file} kind={kind} />
      <ICONS.download size={18} aria-hidden className="shrink-0 text-ink-2" />
    </a>
  );
}

/** A card's face: the kind's icon, then the name over its size. */
function CardFace({ file, kind }: { file: Attachment; kind: FileKind }) {
  return (
    <>
      <KindIcon kind={kind} />
      <span className="flex min-w-0 flex-1 flex-col text-[12.5px] leading-[1.35]">
        <span className="truncate font-medium text-ink">{file.name}</span>
        <span className="text-ink-2">{sizeLabel(file.size)}</span>
      </span>
    </>
  );
}
