"use client";

import { CASE_FILE_TYPES, dropFile, keepFile } from "@/lib/demo/files";
import { persisted, useStored } from "@/lib/demo/live";

/**
 * The Independent's portfolio as work samples uploaded to Hireable (#355, #311): images and PDFs of
 * their work, each with a caption, in the order they put them. Every Team Builder view of the profile
 * shows them, before a hire as well as after it, while the website, LinkedIn and portfolio links stay
 * hidden until there's a contract. The list is one of the demo's stores, so Reset demo clears it; the
 * files themselves go to the browser's file store (@/lib/demo/files), like a dispute's attachments.
 */
export type Sample = { id: string; name: string; type: string; size: number; caption: string };

/** Images and PDFs: the kinds a dispute takes. */
export const SAMPLE_TYPES = CASE_FILE_TYPES;
export const MAX_SAMPLES = 12;
export const MAX_SAMPLE_MB = 10;
export const CAPTION_MAX = 100;

const portfolioStore = persisted<Sample[]>("ind.portfolio", []);

/** The samples on the Independent's profile, in their order: on the talent's own view and every Team Builder's. */
export const usePortfolio = () => useStored(portfolioStore);

/** What the checks read off a file. */
type Picked = Pick<File, "name" | "type" | "size">;

/** Why a file can't be a work sample, or null when it can. */
export function checkSample(f: Picked): string | null {
  if (!SAMPLE_TYPES.includes(f.type)) return `${f.name} has to be an image (PNG, JPG, WebP or GIF) or a PDF.`;
  if (f.size > MAX_SAMPLE_MB * 1024 * 1024) return `${f.name} is ${(f.size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_SAMPLE_MB}MB.`;
  return null;
}

/**
 * The picked files that go on: the right kind, within the size, and no more than there's room for
 * beside the `have` already there. `problem` says what became of the rest: that some didn't fit, or
 * else the first file turned away and why.
 */
export function takeSamples<F extends Picked>(picked: F[], have: number): { taken: F[]; problem: string | null } {
  const fit = picked.filter((f) => !checkSample(f));
  const taken = fit.slice(0, Math.max(0, MAX_SAMPLES - have));
  const left = fit.length - taken.length;
  if (left) return { taken, problem: `A profile shows up to ${MAX_SAMPLES} work samples, so ${left === 1 ? "1 file wasn't" : `${left} files weren't`} added.` };
  return { taken, problem: picked.map(checkSample).find(Boolean) ?? null };
}

/** A sample in the editor: one already on the profile, or a file picked and not kept yet. */
export type DraftSample = { key: string; caption: string } & ({ sample: Sample; file?: never } | { file: File; sample?: never });

/** A draft as a sample to save, its file kept first if it was just picked. */
async function toSample(d: DraftSample): Promise<Sample> {
  const caption = d.caption.trim();
  return d.sample ? { ...d.sample, caption } : { ...(await keepFile(d.file)), caption };
}

const dropAll = (samples: Sample[]) => Promise.all(samples.map((s) => dropFile(s.id).catch(() => undefined)));

/**
 * Saves the editor's list as the profile's samples, in its order: keeps the files just picked, then
 * lets go of the ones taken off. Throws when the browser won't keep a file; the samples stay as they
 * were then, and the files this save did keep are let go again.
 */
export async function savePortfolio(drafts: DraftSample[]): Promise<void> {
  const results = await Promise.allSettled(drafts.map(toSample));
  const saved = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const before = portfolioStore.get();
  const isNew = (s: Sample) => !before.some((b) => b.id === s.id);
  if (saved.length < drafts.length) {
    await dropAll(saved.filter(isNew));
    throw new Error("A work sample couldn't be kept in this browser.");
  }
  portfolioStore.set(saved);
  await dropAll(before.filter((b) => !saved.some((s) => s.id === b.id)));
}
