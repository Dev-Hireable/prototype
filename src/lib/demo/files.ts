"use client";

import { useEffect, useState } from "react";
import type { Attachment } from "@/lib/disputes/case";

/**
 * Files attached to a dispute — screenshots, PDFs — kept in the browser's IndexedDB, which every
 * tab of the app shares and which holds far more than localStorage. The case keeps each file's
 * id, name, type and size; the bytes are read back from here to show them to either party or to
 * support.
 * ponytail: there's no upload server in the prototype, so a file lives in the browser it was
 * added in — the same browser the demo's three portals share.
 */

const DB = "hireable-files";
const STORE = "files";
export const CASE_FILE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
export const MAX_CASE_FILES = 6;
export const MAX_CASE_FILE_MB = 10;

let opening: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

/** Why a file can't go on the case, or null when it can. */
export function checkCaseFile(f: File): string | null {
  if (!CASE_FILE_TYPES.includes(f.type)) return `${f.name}: only images (PNG, JPG, WebP, GIF) and PDFs can be attached.`;
  if (f.size > MAX_CASE_FILE_MB * 1024 * 1024) return `${f.name} is over ${MAX_CASE_FILE_MB} MB.`;
  return null;
}

/** A large screenshot is scaled to 1600px on its longest side before it's kept — still readable, far smaller. */
async function shrink(f: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp)$/.test(f.type) || typeof createImageBitmap === "undefined") return f;
  try {
    const bitmap = await createImageBitmap(f);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return f;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, f.type, 0.88));
    return out && out.size < f.size ? out : f;
  } catch {
    return f;
  }
}

/** Keep a file for the case and say what it is. Throws when the browser won't store it. */
export async function keepFile(f: File): Promise<Attachment> {
  const blob = await shrink(f);
  const id = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await run("readwrite", (s) => s.put(blob, id));
  return { id, name: f.name, type: blob.type || f.type, size: blob.size };
}

const readFile = (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);

/** "240 KB", "1.4 MB". */
export const sizeLabel = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

/** A kept file as a URL to show or open, revoked when it's no longer on screen. `missing` when this browser doesn't have it. */
export function useFileUrl(id: string): { url: string | null; missing: boolean } {
  const [state, setState] = useState<{ id: string; url: string | null; missing: boolean }>({ id, url: null, missing: false });
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    readFile(id)
      .then((blob) => {
        if (!alive) return;
        if (!blob) return setState({ id, url: null, missing: true });
        url = URL.createObjectURL(blob);
        setState({ id, url, missing: false });
      })
      .catch(() => {
        if (alive) setState({ id, url: null, missing: true });
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return state.id === id ? state : { url: null, missing: false };
}
