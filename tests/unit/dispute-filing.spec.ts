import { expect, test } from "@playwright/test";
import type { Dispute } from "../../src/lib/disputes/case";
import { fileBlock, fileBlockHint, type Escrow } from "../../src/lib/demo/disputes";

// When a dispute can be filed (TB-073 / TB-118 / IN-059 / IN-076): once the trial ends, and for as
// long as the contract runs — not before its first day, not while the trial runs, not after it ends.

const KEY = "deal:brand-designer:2026-09-21";
const HELD: Escrow = { total: 1600, released: 0, refunded: 0, held: 1600, onHold: 0 };
const PAID_OUT: Escrow = { ...HELD, released: 1600, held: 0 };
const dispute = (over: Partial<Dispute>) => ({ id: "d1", contract: KEY, filedBy: "team", status: "Pending", amount: 800, ...over }) as Dispute;

test.describe("filing a dispute, by where the contract is", () => {
  test("not before the first day, not while the trial runs, not after the contract ends", () => {
    expect(fileBlock([], KEY, "team", HELD, "starts").block).toBe("starts");
    expect(fileBlock([], KEY, "independent", HELD, "trial").block).toBe("trial");
    // A full-time or part-time role that hasn't started, or has ended, has no escrow to fall back on.
    expect(fileBlock([], KEY, "team", null, "starts").block).toBe("starts");
    expect(fileBlock([], KEY, "independent", null, "ended").block).toBe("ended");
  });

  test("open from the trial's end, and for as long as the role runs", () => {
    for (const phase of ["evaluation", "decision", "offer"] as const) expect(fileBlock([], KEY, "team", HELD, phase).block).toBeNull();
    expect(fileBlock([], KEY, "independent", null, "ongoing").block).toBeNull();
  });

  test("a trial's escrow that has been paid out leaves nothing to dispute", () => {
    expect(fileBlock([], KEY, "team", PAID_OUT, "decision").block).toBe("settled");
  });

  test("a dispute already on it comes first: the other side answers that one instead", () => {
    const open = dispute({});
    expect(fileBlock([open], KEY, "independent", HELD, "ended")).toMatchObject({ block: "open", dispute: open });
    expect(fileBlock([dispute({ filedBy: "independent", status: "Resolved" })], KEY, "independent", null, "ongoing").block).toBe("filed");
  });

  test("one per chapter: a dispute about the trial doesn't use up the role's (user rule 2026-09-26)", () => {
    const trialOne = dispute({ filedBy: "independent", status: "Resolved", type: "trial" });
    expect(fileBlock([trialOne], KEY, "independent", null, "ongoing", "role").block).toBeNull();
    expect(fileBlock([trialOne], KEY, "independent", HELD, "decision", "trial").block).toBe("filed");
    const withdrawn = dispute({ status: "Withdrawn", type: "trial" });
    expect(fileBlock([withdrawn], KEY, "team", null, "ongoing", "role").block).toBeNull();
    expect(fileBlock([dispute({ status: "Withdrawn", type: "full-time" })], KEY, "team", null, "ongoing", "role").block).toBe("withdrawn");
    // Still one open case at a time, whichever chapter it's about.
    expect(fileBlock([dispute({ type: "trial" })], KEY, "independent", null, "ongoing", "role").block).toBe("open");
  });

  test("each block says why, naming the day it changes", () => {
    const days = { starts: "28 Sep 2026", trialEnds: "30 Oct 2026" };
    expect(fileBlockHint("starts", "team", days)).toBe("Filing opens on 28 Sep 2026, the contract's first day");
    expect(fileBlockHint("trial", "independent", days)).toBe("Available once the trial ends on 30 Oct 2026");
    expect(fileBlockHint("ended", "team", days)).toBe("This contract has ended, so it can't be disputed any more");
    expect(fileBlockHint(null, "team", days)).toBeUndefined();
  });
});
