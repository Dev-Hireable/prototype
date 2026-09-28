/**
 * The app's UI scale (globals.css `--ui-scale`: 0.9 on a laptop, 1 on a big screen), the zoom the app
 * is drawn at. Pointer positions and on-screen rects are screen pixels, while a length set in CSS
 * inside the app is drawn at the scale — so screen pixels are divided by this before they're compared
 * with a CSS length.
 */
export function uiZoom(): number {
  if (typeof document === "undefined") return 1;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-scale")) || 1;
}
