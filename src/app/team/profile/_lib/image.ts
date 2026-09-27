import { useState } from "react";
import { checkImage, readImage } from "@/lib/team/data";

/**
 * A photo or logo picked on a profile page: checked, then read for the preview. Nothing is written
 * until Save; a file of the wrong type or size is turned away with the reason why.
 */
export function usePickedImage(onRejected: (why: string) => void) {
  const [preview, setPreview] = useState<string | null>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    const why = checkImage(f);
    if (why) return onRejected(why);
    setPreview(await readImage(f));
  };
  return { preview, pick, clear: () => setPreview(null) };
}
