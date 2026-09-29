import { useState } from "react";
import type { SetToast } from "@/lib/portal/toast";
import { checkImage, readImage } from "@/lib/team/data";

/**
 * A photo or logo picked on a profile page: checked, then read for the preview. Nothing is written
 * until Save; a file of the wrong type or size is turned away, in the page's toast, with the reason why.
 */
export function usePickedImage(onToast: SetToast) {
  const [preview, setPreview] = useState<string | null>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    const why = checkImage(f);
    if (why) return onToast(why, "danger");
    setPreview(await readImage(f));
  };
  return { preview, pick, clear: () => setPreview(null) };
}
