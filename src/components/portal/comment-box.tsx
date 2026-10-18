"use client";

import { useState, type ReactNode } from "react";

/**
 * The comment box — a white card with the text on top, and along its foot any tools (attach, what
 * it sends) and the send button (with no tools, one row: the text beside the send button, like a chat), a send glyph drawn through a mask so it takes the button's colour,
 * grey until there's something to send. Enter sends and Shift+Enter breaks the line. A proposal's
 * Activity pane and a work item's sheet both write their notes with it, so commenting looks and
 * works the same everywhere.
 */
export function CommentBox({
  onSend,
  placeholder = "Add a comment...",
  label = "Add a comment",
  sendLabel = "Send",
  tools,
  maxLength,
  validate,
}: {
  /** Called with the trimmed text; the box empties once it returns. */
  onSend: (text: string) => void;
  placeholder?: string;
  label?: string;
  sendLabel?: string;
  /** Controls at the foot, left of the send button. */
  tools?: ReactNode;
  maxLength?: number;
  /** A reason the text can't be sent yet, shown under it; null when it can. */
  validate?: (text: string) => string | null;
}) {
  const [text, setText] = useState("");
  const problem = text.trim() ? (validate?.(text) ?? null) : null;
  const ready = !!text.trim() && !problem;
  const send = () => {
    if (!ready) return;
    onSend(text.trim());
    setText("");
  };

  const field = (
    <textarea
      rows={1}
      value={text}
      maxLength={maxLength}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          send();
        }
      }}
      aria-label={label}
      aria-invalid={!!problem}
      placeholder={placeholder}
      className="field-sizing-content max-h-40 min-h-[17px] w-full resize-none text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2"
    />
  );
  const said = problem && (
    <p role="alert" className="text-[12px] leading-[1.3] text-danger">
      {problem}
    </p>
  );

  // No tools: one row, the text beside its send button, as a chat's composer.
  if (!tools)
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end gap-2 rounded-xl bg-white py-1.5 pr-1.5 pl-3.5 outline -outline-offset-1 outline-border focus-within:outline-[#a6a6a6]">
          <div className="flex min-w-0 flex-1 py-[7.5px]">{field}</div>
          <SendButton label={sendLabel} disabled={!ready} onClick={send} />
        </div>
        {said}
      </div>
    );
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
      {field}
      {said && <div className="-mt-2">{said}</div>}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">{tools}</div>
        <SendButton label={sendLabel} disabled={!ready} onClick={send} />
      </div>
    </div>
  );
}

/** The box's send button: the send glyph in the button's colour, grey until there's something to send. */
function SendButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-[6.4px] bg-primary text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]"
    >
      {/* The send glyph, masked so it takes the button's text colour. */}
      <span aria-hidden className="size-5 bg-current" style={{ mask: "url(/icons/proposal/send.svg) center / contain no-repeat", WebkitMask: "url(/icons/proposal/send.svg) center / contain no-repeat" }} />
    </button>
  );
}
