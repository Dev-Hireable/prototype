"use client";

import { useState } from "react";
import { AttachButton, PendingFiles } from "@/components/portal/attachments";
import { fileDropHandlers, usePendingFiles } from "@/lib/demo/files";

type CommentBoxProps = {
  /** Called with the trimmed text and the files picked; the box empties once it settles, unless it says why it couldn't send. */
  onSend: (text: string, files: File[]) => void | Promise<string | null>;
  placeholder?: string;
  label?: string;
  sendLabel?: string;
  maxLength?: number;
  /** A reason the text can't be sent yet, shown under it; null when it can. */
  validate?: (text: string) => string | null;
  /** The id of what's said about the box beside it (who a comment notifies), read with it. */
  describedBy?: string;
  /** Files can go with what's written: the paperclip, drop and paste. */
  attach?: boolean;
};

/**
 * The comment box — a white card in one row, as a chat's composer: the text, the paperclip when files
 * can go with it, and the send glyph, grey until there's something to send and blue once there is.
 * Files waiting to go sit above the text. Enter sends and Shift+Enter breaks the line; files can be
 * dropped on the box or pasted into it too. A work item's sheet writes its comments with it.
 */
export function CommentBox({ onSend, placeholder = "Add a comment...", label = "Add a comment", sendLabel = "Send", maxLength, validate, describedBy, attach = false }: CommentBoxProps) {
  const draft = useCommentDraft(onSend, validate);
  const { files } = draft;
  return (
    <div className="flex flex-col gap-1.5">
      <div {...(attach ? fileDropHandlers(files.add) : {})} className="flex flex-col gap-2 rounded-xl bg-white py-1.5 pr-1.5 pl-3.5 outline -outline-offset-1 outline-border focus-within:outline-[#a6a6a6]">
        {files.files.length > 0 && (
          <div className="pt-2 pr-2">
            <PendingFiles files={files.files} onRemove={files.remove} />
          </div>
        )}
        <div className="flex items-end gap-0.5">
          <div className="flex min-w-0 flex-1 py-[7.5px]">
            <CommentField text={draft.text} onText={draft.setText} onSend={draft.send} label={label} invalid={!!draft.problem} placeholder={placeholder} maxLength={maxLength} describedBy={describedBy} />
          </div>
          {attach && <AttachButton onPick={files.add} />}
          <SendButton label={sendLabel} disabled={!draft.ready} onClick={draft.send} />
        </div>
      </div>
      {draft.problem && (
        <p role="alert" className="text-[12px] leading-[1.3] text-danger">
          {draft.problem}
        </p>
      )}
    </div>
  );
}

/**
 * What's typed and the files waiting, and sending them: the box empties once the send settles, and
 * keeps everything — saying why — when it couldn't go (the files couldn't be kept).
 */
function useCommentDraft(onSend: CommentBoxProps["onSend"], validate: CommentBoxProps["validate"]) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const files = usePendingFiles();
  const wrong = text.trim() ? (validate?.(text) ?? null) : null;
  const ready = (!!text.trim() || files.files.length > 0) && !wrong && !busy;
  const send = async () => {
    if (!ready) return;
    setBusy(true);
    let refused: string | null | void;
    try {
      refused = await onSend(text.trim(), files.files);
    } finally {
      setBusy(false);
    }
    if (refused) return files.setError(refused);
    setText("");
    files.clear();
  };
  return { text, setText, files, ready, problem: wrong ?? files.error, send: () => void send() };
}

/** The box's text: it grows with what's typed, Enter sends and Shift+Enter breaks the line. */
function CommentField({ text, onText, onSend, label, invalid, placeholder, maxLength, describedBy }: { text: string; onText: (text: string) => void; onSend: () => void; label: string; invalid: boolean; placeholder: string; maxLength?: number; describedBy?: string }) {
  return (
    <textarea
      rows={1}
      value={text}
      maxLength={maxLength}
      onChange={(e) => onText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onSend();
        }
      }}
      aria-label={label}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      placeholder={placeholder}
      className="field-sizing-content max-h-40 min-h-[17px] w-full resize-none text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2"
    />
  );
}

/**
 * Send, as its glyph alone — no box around it, as in the reference's composer: grey until there's
 * something to send, the app's blue once there is. The comment box and the chat's composer both
 * send with it.
 */
export function SendButton({ label = "Send", disabled, onClick, type = "button" }: { label?: string; disabled: boolean; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary enabled:hover:text-accent disabled:cursor-not-allowed disabled:text-[#c3c3c3]"
    >
      {/* The send glyph, masked so it takes the button's colour. */}
      <span aria-hidden className="size-5 bg-current" style={{ mask: "url(/icons/proposal/send.svg) center / contain no-repeat", WebkitMask: "url(/icons/proposal/send.svg) center / contain no-repeat" }} />
    </button>
  );
}
