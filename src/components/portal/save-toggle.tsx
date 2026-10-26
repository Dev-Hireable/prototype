"use client";

import { ICONS } from "@/components/icons";
import { Button } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";

const Bookmark = ICONS.saved;
const Bookmarked = ICONS.bookmark;

/**
 * The bookmark on a card, the same on a role (Discover, Saved roles) and an Independent (Discover,
 * Saved Independents): saves it, or unsaves it on the spot, the caller's toast saying so with Undo.
 * Drawn at 28px beside the card's buttons, so a touch screen gives it a finger-sized tap round it
 * (hit-area); `className` lets a card draw it bigger on a phone. `what` names the thing saved in the
 * accessible name ("Save role", "Unsave Independent").
 */
export function SaveToggle({ isSaved, onToggle, what, className = "" }: { isSaved: boolean; onToggle: () => void; what: string; className?: string }) {
  const Mark = isSaved ? Bookmarked : Bookmark;
  return (
    <Tip label={isSaved ? "Unsave" : "Save"}>
      <button
        type="button"
        aria-label={`${isSaved ? "Unsave" : "Save"} ${what}`}
        aria-pressed={isSaved}
        onClick={onToggle}
        className={`hit-area flex size-7 shrink-0 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary ${className}`}
      >
        <Mark size={16} aria-hidden />
      </button>
    </Tip>
  );
}

/** Save / Saved as a full button, beside a profile's or a role's other actions; `label` is the unsaved wording ("Save", "Save role"). */
export function SaveButton({ isSaved, onToggle, label = "Save", size = "md" }: { isSaved: boolean; onToggle: () => void; label?: string; size?: "md" | "lg" }) {
  const Mark = isSaved ? Bookmarked : Bookmark;
  return (
    <Button size={size} onClick={onToggle}>
      <Mark size={18} aria-hidden className={isSaved ? "text-primary" : "text-ink-2"} />
      {isSaved ? "Saved" : label}
    </Button>
  );
}
