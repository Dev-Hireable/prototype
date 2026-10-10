import { expect, test } from "@playwright/test";
import { GAP, MARGIN, placeCard, spotlightBox } from "../../src/lib/portal/tour-placement";
import { TOURS, homeTour, onTourPath, sideOf, tourFor } from "../../src/lib/portal/tours";

const VIEW = { width: 1280, height: 800 };
const CARD = { width: 360, height: 220 };

test.describe("guided tours · where the card goes", () => {
  test("below the element when there's room, centred on it", () => {
    const at = placeCard({ x: 400, y: 100, width: 200, height: 60 }, CARD, VIEW);
    expect(at).toEqual({ x: 320, y: 100 + 60 + GAP });
  });

  test("above when below would run off the window, then right, then left", () => {
    expect(placeCard({ x: 400, y: 640, width: 200, height: 60 }, CARD, VIEW).y).toBe(640 - GAP - CARD.height);
    // A rail item as tall as the window: no room above or below, so beside it.
    expect(placeCard({ x: 8, y: 0, width: 88, height: 800 }, CARD, VIEW).x).toBe(8 + 88 + GAP);
    expect(placeCard({ x: 1180, y: 0, width: 92, height: 800 }, CARD, VIEW).x).toBe(1180 - GAP - CARD.width);
  });

  test("never past the window's edges, even for an element at the very corner", () => {
    const at = placeCard({ x: 1250, y: 10, width: 20, height: 20 }, CARD, VIEW);
    expect(at.x).toBe(VIEW.width - CARD.width - MARGIN);
    expect(at.y).toBe(10 + 20 + GAP);
    const tiny = placeCard({ x: 0, y: 0, width: 300, height: 300 }, CARD, { width: 320, height: 568 });
    expect(tiny.x).toBe(MARGIN);
  });

  test("in the middle when there's nothing to point at", () => {
    expect(placeCard(null, CARD, VIEW)).toEqual({ x: 460, y: 290 });
  });

  test("against the roomier edge when no side has room, not over the element's middle", () => {
    const phone = { width: 390, height: 844 };
    // A tall card filling most of a phone, starting high: the card goes to the bottom edge.
    expect(placeCard({ x: 10, y: 60, width: 370, height: 700 }, CARD, phone)).toEqual({ x: 10 + 370 / 2 - 360 / 2, y: 844 - 220 - MARGIN });
    // Ending high up, with more room above than below: the top edge.
    expect(placeCard({ x: 10, y: 400, width: 370, height: 300 }, { width: 360, height: 420 }, phone).y).toBe(MARGIN);
  });

  test("the cut-out is a little larger than the element and stays on screen", () => {
    expect(spotlightBox({ x: 100, y: 100, width: 50, height: 20 }, VIEW)).toEqual({ x: 94, y: 94, width: 62, height: 32 });
    expect(spotlightBox({ x: 2, y: 790, width: 50, height: 20 }, VIEW)).toEqual({ x: 0, y: 784, width: 58, height: 16 });
  });
});

test.describe("guided tours · the tours themselves", () => {
  test("every portal has a getting-started tour, and each screen at most one", () => {
    expect(homeTour("team").path).toBe("/team");
    expect(homeTour("independent").path).toBe("/independent");
    expect(new Set(TOURS.map((t) => t.path)).size).toBe(TOURS.length);
    expect(new Set(TOURS.map((t) => t.id)).size).toBe(TOURS.length);
  });

  test("each tour belongs to the portal its screen is in, and only a last step carries an action", () => {
    for (const t of TOURS) {
      expect(sideOf(t.path), t.id).toBe(t.side);
      expect(tourFor(t.path)).toBe(t);
      expect(t.steps.slice(0, -1).some((s) => s.action), t.id).toBe(false);
    }
  });

  test("a contract's tour covers every contract, and only that screen", () => {
    expect(tourFor("/team/independents/juan-dela-cruz")?.id).toBe("team.contract");
    expect(tourFor("/independent/contracts/brand-designer")?.id).toBe("independent.contract");
    expect(tourFor("/team/independents")).toBeUndefined();
    expect(tourFor("/independent/contracts/brand-designer/offer")).toBeUndefined();
    expect(onTourPath("/team/independents/[slug]", "/team/independents/")).toBe(false);
    expect(tourFor("/team/messages")?.id).toBe("team.messages");
    expect(tourFor("/independent/messages")?.id).toBe("independent.messages");
  });

  test("the copy stays brief and has no em dashes", () => {
    for (const s of TOURS.flatMap((t) => t.steps)) {
      expect(s.title.length, s.title).toBeLessThanOrEqual(32);
      expect(s.body.length, s.title).toBeLessThanOrEqual(160);
      expect(`${s.title} ${s.body}`, s.title).not.toContain("—");
    }
  });
});
