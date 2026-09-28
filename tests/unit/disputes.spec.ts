import { expect, test } from "@playwright/test";
import * as Case from "../../src/lib/disputes/case";
import type { Ctx, Dispute, NewDispute, Step } from "../../src/lib/disputes/case";

const DAY = Case.DAY;
const T0 = Date.UTC(2026, 8, 25, 9); // Fri 25 Sep 2026, 09:00 UTC
const when = (ms: number) => new Date(ms).toISOString().slice(0, 16);
const at = (ms: number, extra: Partial<Ctx> = {}): Ctx => ({ now: ms, when, handler: "Admin Lead", ...extra });

const base: NewDispute = {
  id: "dsp-1",
  contract: "deal:brand-designer:2026-09-21",
  links: { team: "juan-dela-cruz", independent: "brand-designer" },
  title: "Brand Designer",
  type: "trial",
  rate: "$1,600 /month",
  team: { name: "Alex Rivera", company: "Nairobi Solutions Inc.", slug: "nairobi-solutions" },
  independent: { name: "Juan Dela Cruz", slug: "juan-dela-cruz", avatar: "/team/juan.jpg" },
  filedBy: "team",
  reason: "Missed Deadline",
  description: "The logo drafts came two weeks late.",
  amount: 1600,
  facts: { started: "21 Sep 2026", ends: "30 Oct 2026", trialEnded: true, evaluation: false, tasksDone: 1, tasksTotal: 7, escrowHeld: 1600 },
};

/** The step, or a failed test saying why it was refused. */
function ok(r: Step | Case.Refusal | null): Step {
  if (!r) throw new Error("expected a step, got nothing");
  if (!r.ok) throw new Error(`refused: ${r.error}`);
  return r;
}
const filed = (over: Partial<NewDispute> = {}) => Case.openCase({ ...base, ...over }, at(T0)).next;

test.describe("a dispute as a case, in turns", () => {
  test("filing opens it on the other side's turn, with five days to respond", () => {
    const out = Case.openCase(base, at(T0));
    expect(out.next.status).toBe("Pending");
    expect(out.next.turn).toEqual({ who: "independent", since: T0, due: T0 + 5 * DAY, why: "respond" });
    expect(out.next.entries).toMatchObject([{ kind: "filed", by: "team", text: base.description }]);
    expect(out.notices).toEqual([expect.objectContaining({ to: "independent", from: "team", title: "Nairobi Solutions Inc. filed a dispute" })]);
    expect(out.notices[0].body).toContain(when(T0 + 5 * DAY));
  });

  test("the party whose turn it is responds, and the case moves to support", () => {
    const d = filed();
    const out = ok(Case.respond(d, "independent", { text: "  They were late because the brief changed.  ", link: "drive.example/brief" }, at(T0 + DAY)));
    expect(out.next.turn).toEqual({ who: "support", since: T0 + DAY });
    expect(out.next.entries.at(-1)).toMatchObject({ kind: "response", by: "independent", text: "They were late because the brief changed.", link: "drive.example/brief" });
    expect(out.notices).toEqual([expect.objectContaining({ to: "team", from: "independent" })]);
  });

  test("responding is refused out of turn, empty, or once the turn has run out", () => {
    const d = filed();
    expect(Case.respond(d, "team", { text: "Me again" }, at(T0 + DAY))).toEqual({ ok: false, error: "It isn't your turn to respond." });
    expect(Case.respond(d, "independent", { text: "   " }, at(T0 + DAY)).ok).toBe(false);
    expect(Case.respond(d, "independent", { text: "Too late" }, at(T0 + 5 * DAY))).toEqual({ ok: false, error: "The time to respond has run out." });
  });

  test("the other side can add information without taking the turn; the turn's owner responds instead", () => {
    const d = filed();
    const out = ok(Case.addInfo(d, "team", { text: "Here's the thread.", attachments: [{ id: "file-1", name: "thread.png", type: "image/png", size: 120_000 }] }, at(T0 + 2 * DAY)));
    expect(out.next.turn).toEqual(d.turn);
    expect(out.next.entries.at(-1)).toMatchObject({ kind: "info", by: "team", attachments: [{ id: "file-1" }] });
    expect(Case.addInfo(d, "independent", { text: "x" }, at(T0 + DAY))).toEqual({ ok: false, error: "It's your turn — respond instead." });
  });

  test("support asks one side once it's its turn, and that side gets five days", () => {
    const answered = ok(Case.respond(filed(), "independent", { text: "Answer" }, at(T0 + DAY))).next;
    const out = ok(Case.ask(answered, "team", "Send the message where the deadline was agreed.", at(T0 + 2 * DAY)));
    expect(out.next.turn).toEqual({ who: "team", since: T0 + 2 * DAY, due: T0 + 7 * DAY, why: "asked", note: "Send the message where the deadline was agreed." });
    expect(out.next.handler).toBe("Admin Lead");
    expect(out.notices.map((n) => [n.to, n.from])).toEqual([
      ["team", "support"],
      ["independent", "support"],
    ]);
    // Not while a party is already on the clock.
    expect(Case.ask(filed(), "team", "Anything?", at(T0)).ok).toBe(false);
  });

  test("support extends a deadline before it runs out, never after", () => {
    const d = filed();
    const out = ok(Case.extend(d, 2, at(T0 + 4 * DAY)));
    expect(Case.partyTurn(out.next)?.due).toBe(T0 + 7 * DAY);
    expect(out.next.entries.at(-1)).toMatchObject({ kind: "extended", to: "independent", due: T0 + 7 * DAY });
    expect(Case.extend(d, 2, at(T0 + 5 * DAY)).ok).toBe(false);
    expect(Case.extend(d, 0, at(T0)).ok).toBe(false);
    expect(Case.extend(d, 6, at(T0)).ok).toBe(false);
  });
});

test.describe("a turn that runs out", () => {
  test("nothing happens before the deadline", () => {
    expect(Case.expire(filed(), at(T0 + 5 * DAY - 1))).toBeNull();
  });

  test("the company wins when the independent doesn't respond — refunded at once, capped by the escrow", () => {
    const out = ok(Case.expire(filed(), at(T0 + 6 * DAY, { held: 1200 })));
    expect(out.next.status).toBe("Resolved");
    expect(out.next.turn).toBeUndefined();
    expect(out.next.resolution).toMatchObject({ kind: "default", favor: "team", payment: "refunded", moved: 1200 });
    expect(out.money).toEqual({ refund: 1200, release: 0 });
    expect(out.next.entries.at(-1)).toMatchObject({ kind: "missed", by: "system", to: "independent", at: T0 + 5 * DAY });
    expect(out.notices.map((n) => [n.to, n.title])).toEqual([
      ["independent", "The dispute closed — no response"],
      ["team", "The dispute closed in your favor"],
    ]);
  });

  test("the independent wins when the company doesn't answer — released once support pays it out", () => {
    const d = filed({ filedBy: "independent" });
    const out = ok(Case.expire(d, at(T0 + 5 * DAY)));
    expect(out.next.resolution).toMatchObject({ kind: "default", favor: "independent", payment: "awaiting release" });
    expect(out.money).toBeUndefined();
    const paid = ok(Case.release(out.next, at(T0 + 6 * DAY, { held: 1600 })));
    expect(paid.next.resolution).toMatchObject({ payment: "released", moved: 1600 });
    expect(paid.money).toEqual({ refund: 0, release: 1600 });
  });

  test("a day before the deadline, the party on the clock is reminded — once", () => {
    const d = filed();
    expect(Case.remind(d, at(T0 + 3 * DAY))).toBeNull();
    const out = ok(Case.remind(d, at(T0 + 4 * DAY + 1)));
    expect(out.notices).toEqual([expect.objectContaining({ to: "independent", title: "One day left to respond" })]);
    expect(Case.remind(out.next, at(T0 + 4 * DAY + 2))).toBeNull();
  });
});

test.describe("settling between themselves", () => {
  test("a proposal has to split the amount in question exactly", () => {
    expect(Case.checkSplit(1600, 800, 800)).toBeNull();
    // Compared in cents, so 0.1 + 0.2 is 0.3 here.
    expect(Case.checkSplit(0.3, 0.1, 0.2)).toBeNull();
    expect(Case.checkSplit(1600, 800, 700)).toContain("add up to $1,600.00");
    expect(Case.checkSplit(1600, -1, 1601)).toBe("Enter amounts of $0.00 or more.");
    expect(Case.propose(filed(), "independent", { refund: 100, release: 100 }, at(T0)).ok).toBe(false);
  });

  test("a newer proposal replaces the one still open, from either side", () => {
    const one = ok(Case.propose(filed(), "independent", { refund: 400, release: 1200 }, at(T0 + DAY))).next;
    const two = ok(Case.propose(one, "team", { refund: 1000, release: 600, note: "Meet in the middle" }, at(T0 + 2 * DAY))).next;
    expect(two.proposals.map((p) => [p.by, p.state])).toEqual([
      ["independent", "replaced"],
      ["team", "open"],
    ]);
    expect(Case.openProposal(two)).toMatchObject({ by: "team", refund: 1000, release: 600 });
  });

  test("accepting closes the case and moves both parts; declining keeps it going", () => {
    const offered = ok(Case.propose(filed(), "independent", { refund: 400, release: 1200 }, at(T0 + DAY))).next;
    expect(Case.answer(offered, "independent", true, at(T0 + DAY)).ok).toBe(false);
    const declined = ok(Case.answer(offered, "team", false, at(T0 + 2 * DAY)));
    expect(declined.next.status).toBe("Pending");
    expect(declined.next.proposals[0].state).toBe("declined");
    expect(declined.notices).toEqual([expect.objectContaining({ to: "independent", title: "Nairobi Solutions Inc. declined your proposal" })]);

    const accepted = ok(Case.answer(offered, "team", true, at(T0 + 2 * DAY, { held: 1600 })));
    expect(accepted.next.status).toBe("Resolved");
    expect(accepted.next.resolution).toMatchObject({ kind: "agreement", payment: "split", split: { refund: 400, release: 1200 }, moved: 1600 });
    expect(accepted.money).toEqual({ refund: 400, release: 1200 });
    expect(Case.outcomeOf(accepted.next)).toBe("Settled by agreement · $400.00 back to Nairobi Solutions Inc. · $1,200.00 to Juan Dela Cruz");
  });

  test("an accepted split never moves more than the escrow still holds — the refund first", () => {
    const offered = ok(Case.propose(filed(), "independent", { refund: 400, release: 1200 }, at(T0 + DAY))).next;
    expect(ok(Case.answer(offered, "team", true, at(T0 + DAY, { held: 1000 }))).money).toEqual({ refund: 400, release: 600 });
  });
});

test.describe("closing the case", () => {
  test("only the filer withdraws, and an open proposal goes with it", () => {
    const offered = ok(Case.propose(filed(), "independent", { refund: 0, release: 1600 }, at(T0))).next;
    expect(Case.withdraw(offered, "independent", at(T0)).ok).toBe(false);
    const out = ok(Case.withdraw(offered, "team", at(T0 + DAY)));
    expect(out.next.status).toBe("Withdrawn");
    expect(out.next.proposals[0].state).toBe("void");
  });

  test("support rules: for the company it refunds now, for the independent it waits on the release", () => {
    const forTeam = ok(Case.rule(filed(), "team", "The drafts were late by the task log.", at(T0 + DAY, { held: 1600 })));
    expect(forTeam.next.resolution).toMatchObject({ kind: "ruling", favor: "team", payment: "refunded", moved: 1600 });
    expect(forTeam.money).toEqual({ refund: 1600, release: 0 });
    const forInd = ok(Case.rule(filed(), "independent", "The brief changed.", at(T0 + DAY)));
    expect(forInd.next.resolution).toMatchObject({ payment: "awaiting release" });
    expect(forInd.money).toBeUndefined();
    expect(Case.rule(filed(), "team", "  ", at(T0)).ok).toBe(false);
  });

  test("rejecting lifts the hold and rules for nobody", () => {
    const out = ok(Case.reject(filed(), "The process was followed.", at(T0 + DAY)));
    expect(out.next).toMatchObject({ status: "Rejected", resolution: { kind: "rejected" } });
    expect(out.money).toBeUndefined();
    expect(Case.outcomeOf(out.next)).toBe("Rejected — the agreed process was followed");
  });
});

test.describe("reading a case", () => {
  test("what each party can do follows the turn", () => {
    const d = filed();
    expect(Case.partyCan(d, "independent", T0 + DAY)).toMatchObject({ respond: true, add: false, withdraw: false, answer: null });
    expect(Case.partyCan(d, "team", T0 + DAY)).toMatchObject({ respond: false, add: true, withdraw: true });
    // A turn that has run out can't be answered any more — it's about to close.
    expect(Case.partyCan(d, "independent", T0 + 5 * DAY)).toMatchObject({ respond: false, add: false });
    const offered = ok(Case.propose(d, "team", { refund: 1600, release: 0 }, at(T0))).next;
    expect(Case.partyCan(offered, "independent", T0).answer?.by).toBe("team");
  });

  test("the countdown reads in days, then hours", () => {
    expect(Case.leftLabel(T0 + 5 * DAY, T0)).toBe("5 days left");
    expect(Case.leftLabel(T0 + DAY + 3_600_000, T0)).toBe("1 day left");
    expect(Case.leftLabel(T0 + 7 * 3_600_000, T0)).toBe("7 hours left");
    expect(Case.leftLabel(T0 + 60_000, T0)).toBe("Less than an hour left");
    expect(Case.leftLabel(T0, T0)).toBe("Overdue");
  });
});

test.describe("disputes saved before cases had turns", () => {
  const legacy = {
    ...base,
    at: T0,
    status: "Pending",
    updated: T0 + 2 * DAY,
    statements: [
      { at: T0 + DAY, from: "independent", text: "The brief changed.", evidence: "drive.example/brief" },
      { at: T0 + 2 * DAY, from: "team", text: "It didn't." },
    ],
    timeline: [
      { at: T0, event: "Dispute filed", actor: "Alex Rivera" },
      { at: T0, event: "Juan Dela Cruz notified", actor: "system" },
      { at: T0 + DAY, event: "Response added", actor: "Juan Dela Cruz" },
      { at: T0 + 2 * DAY, event: "Evidence requested from both parties", actor: "admin: Admin Lead" },
    ],
  } as unknown as Dispute;

  test("the claim, the statements and support's log become one timeline, said once", () => {
    const d = Case.migrateDispute(legacy);
    expect(d.entries.map((e) => [e.kind, e.by])).toEqual([
      ["filed", "team"],
      ["response", "independent"],
      ["info", "team"],
      ["note", "support"],
    ]);
    expect(d.entries[1].link).toBe("drive.example/brief");
    expect(d.entries[3]).toMatchObject({ name: "Admin Lead", text: "Evidence requested from both parties" });
    expect(d.proposals).toEqual([]);
    expect("statements" in d).toBe(false);
  });

  test("an open one waits on support, so nobody loses it under a deadline it never had", () => {
    const d = Case.migrateDispute(legacy);
    expect(d.turn).toEqual({ who: "support", since: T0 + 2 * DAY });
    expect(Case.expire(d, at(T0 + 100 * DAY))).toBeNull();
  });

  test("a closed one keeps its outcome, and a migrated record is left as it is", () => {
    const d = Case.migrateDispute({ ...legacy, status: "Resolved", resolution: { favor: "team", notes: "Late", at: T0 + 3 * DAY, payment: "refunded", moved: 1600 } } as unknown as Dispute);
    expect(d.turn).toBeUndefined();
    expect(d.resolution).toMatchObject({ kind: "ruling", favor: "team" });
    expect(Case.migrateDispute(d)).toBe(d);
  });
});
