"use client";

import { useState } from "react";
import { savePortfolio, takeSamples, type DraftSample, type Sample } from "@/lib/demo/portfolio";
import type { SetToast } from "@/lib/portal/toast";

let picks = 0;
/** A key for a file picked in the editor, unique in the tab. */
const pickedKey = () => `picked-${++picks}`;

/** `list` with the item at `from` moved to `to`; the same list when `to` is past either end. */
function moved<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || to === from) return list;
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/**
 * The work samples editor's list (#355, #311): the saved samples to start with, then whatever is
 * added, captioned, moved and taken off. Nothing is kept until `save`, so Cancel leaves the samples
 * as they were. A file turned away says why in a danger toast, and so does a save the browser refuses.
 */
export function useSampleDrafts(samples: Sample[], onMessage: SetToast) {
  const [items, setItems] = useState<DraftSample[]>(() => samples.map((s) => ({ key: s.id, caption: s.caption, sample: s })));
  const [busy, setBusy] = useState(false);
  const add = (files: File[]) => {
    const { taken, problem } = takeSamples(files, items.length);
    if (taken.length) setItems((all) => [...all, ...taken.map((file) => ({ key: pickedKey(), caption: "", file }))]);
    if (problem) onMessage(problem, "danger");
  };
  /** Keeps the list as the profile's samples; whether it could. */
  const save = async () => {
    setBusy(true);
    try {
      await savePortfolio(items);
      return true;
    } catch {
      onMessage("Your work samples couldn't be saved in this browser. Try fewer or smaller files.", "danger");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return {
    items,
    busy,
    add,
    save,
    caption: (key: string, caption: string) => setItems((all) => all.map((d) => (d.key === key ? { ...d, caption } : d))),
    move: (from: number, to: number) => setItems((all) => moved(all, from, to)),
    remove: (key: string) => setItems((all) => all.filter((d) => d.key !== key)),
  };
}
