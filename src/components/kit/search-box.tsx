"use client";

import { useState } from "react";
import { ICONS } from "@/components/icons";
import { keyed } from "@/lib/portal/keys";

/**
 * Marks every case-insensitive occurrence of `query` inside `text` (TB-009: "matching keywords
 * are highlighted in the results"). An empty query renders the text untouched.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  // A span, not a fragment: callers render this inside flex containers, where loose text nodes
  // and <mark> would each become their own flex item and stack instead of flowing inline.
  if (!q) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <span>
      {keyed(parts, (p) => p).map(({ item: part, key }) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={key} className="rounded-[3px] bg-[#fff2c2] text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}

/**
 * The one search field. A page that filters by it passes `value` and `onChange`; without them it
 * keeps what's typed itself (a list that doesn't filter yet), so a Server Component can render it.
 */
export function SearchBox({ value: controlled, onChange: onControlledChange, placeholder, className = "" }: { value?: string; onChange?: (v: string) => void; placeholder: string; className?: string }) {
  const S = ICONS.search;
  const X = ICONS.close;
  const [own, setOwn] = useState("");
  const value = controlled ?? own;
  const onChange = (v: string) => {
    if (controlled === undefined) setOwn(v);
    onControlledChange?.(v);
  };
  return (
    <label className={`flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-ink-2 ${className}`}>
      <S size={16} aria-hidden />
      {/* Named outright: from the label's content it had no name but its placeholder, and once
          something was typed the Clear search button's name joined it. */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2"
      />
      {/* TB-012: an explicit clear button while a search is active — restores the full list. */}
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="flex size-5 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-alt hover:text-ink">
          <X size={16} aria-hidden />
        </button>
      )}
    </label>
  );
}
