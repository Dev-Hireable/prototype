"use client";

import { useEffect, useState } from "react";

/**
 * The talent's own intro video, as their profile and every Team Builder view of it play it (IN-060).
 * A video is far too big for localStorage, so the file itself goes to IndexedDB; a flag under the
 * demo's localStorage prefix says one has been added, so Reset demo — which clears that prefix —
 * drops it along with everything else.
 */
const FLAG = "hireable.demo.ind.intro";
const DB = "hireable-demo";
const STORE = "files";
const KEY = "ind.intro";
/** Tells this tab's other views a new intro is in; other tabs hear it through the flag's storage event. */
const CHANGED = "hireable:intro";

export const INTRO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const INTRO_MAX_MB = 100;

/** Why a file can't be the intro, or null when it can. */
export function checkIntro(file: File): string | null {
  if (!INTRO_TYPES.includes(file.type)) return "Use an MP4, WebM or MOV video.";
  if (file.size > INTRO_MAX_MB * 1024 * 1024) return `Keep the video under ${INTRO_MAX_MB} MB.`;
  return null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function inStore<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = op(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveIntro(file: Blob) {
  await inStore("readwrite", (s) => s.put(file, KEY));
  localStorage.setItem(FLAG, String(Date.now()));
  window.dispatchEvent(new Event(CHANGED));
}

async function loadIntro(): Promise<Blob | null> {
  if (!localStorage.getItem(FLAG)) {
    // Reset demo cleared the flag: let go of the file it left behind.
    await inStore("readwrite", (s) => s.delete(KEY)).catch(() => undefined);
    return null;
  }
  return (await inStore<Blob | undefined>("readonly", (s) => s.get(KEY))) ?? null;
}

/** The intro the talent added, as a URL a <video> can play — null until there is one, and while it loads. */
export function useIntroVideo(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let current: string | null = null;
    let live = true;
    const load = () =>
      loadIntro()
        .then((blob) => {
          if (!live) return;
          if (current) URL.revokeObjectURL(current);
          // Let go when the next one replaces it (above) or the hook unmounts (below).
          // react-doctor-disable-next-line react-doctor/no-create-object-url-without-revoke
          current = blob ? URL.createObjectURL(blob) : null;
          setUrl(current);
        })
        .catch(() => undefined);
    const onStorage = (e: StorageEvent) => e.key === FLAG && load();
    load();
    window.addEventListener(CHANGED, load);
    window.addEventListener("storage", onStorage);
    return () => {
      live = false;
      window.removeEventListener(CHANGED, load);
      window.removeEventListener("storage", onStorage);
      if (current) URL.revokeObjectURL(current);
    };
  }, []);
  return url;
}
