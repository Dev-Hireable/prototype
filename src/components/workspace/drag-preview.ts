import { uiZoom } from "@/lib/portal/zoom";

/** A 1×1 transparent image: the browser's own drag image, so only the lifted card shows. */
let blank: HTMLImageElement | null = null;
function blankImage() {
  if (!blank) {
    blank = new Image();
    blank.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }
  return blank;
}

/** Loads the blank image ahead of the first drag — set on a drag that's already started, an image still loading draws nothing at all. */
export function preloadDragImage() {
  blankImage();
}

/**
 * Picks a card up: the browser's own drag image is a see-through ghost fading at its edges, so it's
 * swapped for a blank one and a solid copy of the card follows the pointer instead — tilted a little,
 * lifted on a shadow, held at the point it was grabbed. The copy is hidden from assistive tech and
 * takes no clicks. Returns what puts it away, once the drag ends however it ends.
 */
export function liftCard(card: HTMLElement, e: DragEvent): () => void {
  e.dataTransfer?.setDragImage(blankImage(), 0, 0);
  const r = card.getBoundingClientRect();
  const grab = { x: e.clientX - r.left, y: e.clientY - r.top };
  const scale = uiZoom();

  const copy = card.cloneNode(true) as HTMLElement;
  for (const name of copy.getAttributeNames()) if (name.startsWith("data-") || name === "tabindex" || name === "draggable") copy.removeAttribute(name);
  // Drawn at the app's scale (it's outside the scaled app, on <body>), as wide as the card it lifts.
  Object.assign(copy.style, { width: `${r.width / scale}px`, zoom: String(scale), contentVisibility: "visible", transition: "none" });

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  Object.assign(layer.style, { position: "fixed", left: "0", top: "0", zIndex: "60", pointerEvents: "none", willChange: "transform" });
  const place = (x: number, y: number) => {
    layer.style.transform = `translate(${x - grab.x}px, ${y - grab.y}px)`;
  };
  place(e.clientX, e.clientY);
  // The lift: a quick tilt and shadow as it leaves the board.
  copy.animate([{ transform: "none", boxShadow: "0 0 0 rgba(0,0,0,0)" }, { transform: "rotate(2deg) scale(1.02)", boxShadow: "0 12px 28px rgba(0,0,0,0.18)" }], { duration: 150, easing: "ease-out", fill: "forwards" });
  layer.append(copy);
  document.body.append(layer);

  // dragover reports where the pointer is in every browser (drag's own coordinates are 0 in Firefox).
  const follow = (ev: DragEvent) => {
    if (ev.clientX || ev.clientY) place(ev.clientX, ev.clientY);
  };
  document.addEventListener("dragover", follow, true);
  return () => {
    document.removeEventListener("dragover", follow, true);
    layer.remove();
  };
}
