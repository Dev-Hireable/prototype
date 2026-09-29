/** What a profile's fields accept, on either side: a photo or logo upload, and a web address. */

/** TB-120 / TB-123 — what an upload has to be before it is allowed to replace a photo or logo. */
const IMAGE_TYPES = ["image/jpeg", "image/png"];
export const IMAGE_MAX_MB = 5;
/**
 * Reads the file as a data URL rather than an object URL: the profile is persisted to
 * localStorage, and a `blob:` URL is dead the moment the page reloads.
 */
export const readImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Returns the reason an upload was rejected, or null when it is fine. */
export function checkImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return "That file has to be a JPG or a PNG.";
  if (file.size > IMAGE_MAX_MB * 1024 * 1024) return `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${IMAGE_MAX_MB}MB.`;
  return null;
}

/** TB-128 — accepts a bare domain as well as a full URL, rejects anything that isn't one. */
export const isUrl = (v: string) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v.trim());
