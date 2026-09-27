"use client";

import { getDeal } from "@/lib/demo/deal";
import { STORAGE_MESSAGE, WorkError, type WorkErrorCode } from "./errors";
import type { WorkRepository } from "./repository";
import { setTestHook } from "./store";

/**
 * The E2E test seam — only ever loaded by a build made with NEXT_PUBLIC_E2E=1 (see ./e2e). It puts
 * one handle on the window, per tab:
 *
 *   __hireable.work       the repository this portal's workspace uses, bound to its person — so a
 *                         test can call the "API" directly and see it refuse what the UI hides;
 *   __hireable.fault      make the next saves slow and/or fail (per operation, per tab);
 *   __hireable.snapshot() the saved work items, straight from storage.
 */

type Fault = { op?: string; mode?: "fail" | "conflict"; latencyMs?: number; times?: number; message?: string };

let faults: Fault[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hook(op: string) {
  const f = faults.find((x) => !x.op || x.op === op);
  if (!f) return;
  if (f.times !== undefined) {
    f.times -= 1;
    if (f.times <= 0) faults = faults.filter((x) => x !== f);
  }
  if (f.latencyMs) await sleep(f.latencyMs);
  if (f.mode === "fail") throw new WorkError("storage", f.message ?? STORAGE_MESSAGE);
  if (f.mode === "conflict") throw new WorkError("conflict", f.message ?? "Someone changed this first, so your change wasn't saved.");
}

type Seam = {
  work: WorkRepository | null;
  fault: { set: (f: Fault) => void; clear: () => void };
  snapshot: () => unknown;
  /** Runs a repository call and reports its outcome as plain data, for page.evaluate. */
  call: (method: string, ...args: unknown[]) => Promise<{ ok: true; value: unknown } | { ok: false; code: WorkErrorCode | "error"; message: string }>;
};

declare global {
  interface Window {
    __hireable?: Seam;
  }
}

export function installSeam(repo: WorkRepository) {
  setTestHook(hook);
  const seam: Seam = window.__hireable ?? {
    work: null,
    fault: {
      set: (f) => {
        faults.push({ ...f });
      },
      clear: () => {
        faults = [];
      },
    },
    // Plain JSON on purpose, here and below: what a test compares is what's saved — functions and
    // undefined dropped, as over the wire (structuredClone would throw on a function).
    // react-doctor-disable-next-line react-doctor/no-json-parse-stringify-clone
    snapshot: () => JSON.parse(JSON.stringify(getDeal()?.contract?.tasks ?? [])),
    call: async (method, ...args) => {
      const r = window.__hireable?.work as unknown as Record<string, (...a: unknown[]) => Promise<unknown>> | null;
      try {
        if (!r || typeof r[method] !== "function") throw new Error(`No such method: ${method}`);
        // react-doctor-disable-next-line react-doctor/no-json-parse-stringify-clone
        return { ok: true, value: JSON.parse(JSON.stringify(await r[method](...args))) };
      } catch (e) {
        const w = e as WorkError;
        return { ok: false, code: w?.name === "WorkError" ? w.code : "error", message: String(w?.message ?? e) };
      }
    },
  };
  seam.work = repo;
  window.__hireable = seam;
}
