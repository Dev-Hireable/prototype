import { expect, test } from "@playwright/test";
import { lifecycleOf, nextPay, NOTICE_DAYS, noticeLastDay, payPeriods, statusOf, trialClosed, type ContractFacts } from "../../src/lib/contract/lifecycle";
import { trialClock } from "../../src/lib/demo/dates";

/** Friday 25 Sep 2026, 9 AM — the tests' today. */
const NOW = new Date(2026, 8, 25, 9);
const trial = (over: Partial<ContractFacts> = {}): ContractFacts => ({ startedAs: "trial", started: "2026-09-21", ends: "2026-10-30", evaluated: false, trialDone: false, ...over });
const direct = (over: Partial<ContractFacts> = {}): ContractFacts => ({ startedAs: "full-time", started: "2026-09-01", evaluated: false, trialDone: false, ...over });
const offer = (status: "sent" | "accepted" | "declined" | "withdrawn" | "expired", start = "2026-09-28") => ({ type: "full-time" as const, status, start });

test.describe("the trial clock", () => {
  test("counts its first and last days, and runs through the last one", () => {
    // Mon 21 Sep – Fri 30 Oct is six weeks: thirty working days.
    expect(trialClock("2026-09-21", "2026-10-30", NOW)).toEqual({ label: "Day 5 of 30", left: 26, over: false, total: 30 });
    expect(trialClock("2026-09-21", "2026-09-25", NOW)).toEqual({ label: "Day 5 of 5", left: 1, over: false, total: 5 });
    expect(trialClock("2026-09-21", "2026-09-24", NOW)).toMatchObject({ label: "Day 4 of 4", left: 0, over: true });
  });
});

test.describe("the lifecycle", () => {
  test("a trial runs through its last day, then waits on the evaluation", () => {
    expect(lifecycleOf(trial(), NOW).phase).toBe("trial");
    expect(lifecycleOf(trial({ ends: "2026-09-25" }), NOW).phase).toBe("trial");
    const l = lifecycleOf(trial({ ends: "2026-09-24" }), NOW);
    expect(l.phase).toBe("evaluation");
    expect(trialClosed(l)).toBe(true);
    expect(l.trial?.evaluationDue).toEqual(new Date(2026, 8, 29));
    expect(statusOf(l, "team")).toEqual({ label: "Evaluation due", tone: "warn" });
    expect(statusOf(l, "independent")).toEqual({ label: "Awaiting evaluation", tone: "neutral" });
  });

  test("closes early once every trial task is approved", () => {
    const l = lifecycleOf(trial({ trialDone: true }), NOW);
    expect(l.phase).toBe("evaluation");
    expect(l.trial).toMatchObject({ closedEarly: true, day: "Closed early" });
  });

  test("an evaluation not sent within five days of the last day is overdue", () => {
    const l = lifecycleOf(trial({ ends: "2026-09-18" }), NOW);
    expect(l.trial?.evaluationOverdue).toBe(true);
    expect(statusOf(l, "team")).toEqual({ label: "Evaluation overdue", tone: "danger" });
  });

  test("evaluated, it's decided: an offer goes out, and a declined or withdrawn one comes back", () => {
    const closed = { ends: "2026-09-24", evaluated: true };
    expect(lifecycleOf(trial(closed), NOW).phase).toBe("decision");
    expect(statusOf(lifecycleOf(trial(closed), NOW), "team").label).toBe("Evaluation sent");
    const out = lifecycleOf(trial({ ...closed, conversion: offer("sent") }), NOW);
    expect(out).toMatchObject({ phase: "offer", offered: "full-time" });
    expect(statusOf(out, "team").label).toBe("Full-time offer sent");
    expect(statusOf(out, "independent").label).toBe("Full-time offer to review");
    expect(lifecycleOf(trial({ ...closed, conversion: offer("declined") }), NOW).phase).toBe("decision");
    expect(lifecycleOf(trial({ ...closed, conversion: offer("withdrawn") }), NOW).phase).toBe("decision");
  });

  test("accepted, it carries on as the role from the offer's start, with the trial kept as history", () => {
    const later = lifecycleOf(trial({ ends: "2026-09-24", evaluated: true, conversion: offer("accepted", "2026-10-01") }), NOW);
    expect(later).toMatchObject({ phase: "starts", type: "full-time", converted: true, since: "2026-10-01" });
    expect(statusOf(later, "independent").label).toBe("Starts 01 Oct 2026");
    const now = lifecycleOf(trial({ ends: "2026-09-24", evaluated: true, conversion: offer("accepted", "2026-09-25") }), NOW);
    expect(now).toMatchObject({ phase: "ongoing", type: "full-time", startedAsTrial: true });
    expect(now.trial?.ends).toBe("2026-09-24");
    expect(statusOf(now, "team")).toEqual({ label: "Active", tone: "ok" });
  });

  test("a direct hire has no trial chapter", () => {
    expect(lifecycleOf(direct(), NOW)).toMatchObject({ phase: "ongoing", type: "full-time", startedAsTrial: false, trial: undefined });
    expect(lifecycleOf(direct({ started: "2026-10-05" }), NOW).phase).toBe("starts");
  });

  test("ended is final, whatever else is true", () => {
    expect(lifecycleOf(trial({ ended: true, endedOn: "24 Sep 2026", conversion: offer("accepted") }), NOW)).toMatchObject({ phase: "ended", endedOn: "24 Sep 2026" });
    expect(lifecycleOf(direct({ ended: true }), NOW).phase).toBe("ended");
  });
});

test.describe("after the trial: offers that expire, and notice (user rules 2026-09-26)", () => {
  const closed = { ends: "2026-09-18", evaluated: true };

  test("a post-trial offer can be answered up to its start date, then it expires back to the decision", () => {
    expect(lifecycleOf(trial({ ...closed, conversion: offer("sent", "2026-09-25") }), NOW).phase).toBe("offer");
    const lapsed = lifecycleOf(trial({ ...closed, conversion: offer("sent", "2026-09-24") }), NOW);
    expect(lapsed).toMatchObject({ phase: "decision", expired: "full-time" });
    expect(statusOf(lapsed, "team")).toEqual({ label: "Full-time offer expired", tone: "warn" });
    // Once the clock has marked it, it reads the same.
    expect(lifecycleOf(trial({ ...closed, conversion: offer("expired", "2026-09-24") }), NOW)).toMatchObject({ phase: "decision", expired: "full-time" });
    // A declined one isn't "expired".
    expect(lifecycleOf(trial({ ...closed, conversion: offer("declined", "2026-09-24") }), NOW).expired).toBeUndefined();
  });

  test("notice keeps the role running through its last day, then it has ended", () => {
    expect(NOTICE_DAYS).toEqual({ "full-time": 30, "part-time": 14 });
    expect(noticeLastDay("full-time", NOW)).toEqual(new Date(2026, 9, 25));
    expect(noticeLastDay("part-time", NOW)).toEqual(new Date(2026, 9, 9));
    const running = lifecycleOf(direct({ notice: { by: "independent", given: "2026-09-20", lastDay: "2026-09-25" } }), NOW);
    expect(running).toMatchObject({ phase: "ongoing", notice: { by: "independent", lastDay: "2026-09-25" } });
    expect(statusOf(running, "team")).toEqual({ label: "Ends 25 Sep 2026", tone: "warn" });
    const over = lifecycleOf(direct({ notice: { by: "team", given: "2026-09-10", lastDay: "2026-09-24" } }), NOW);
    expect(over).toMatchObject({ phase: "ended", endedOn: "24 Sep 2026" });
  });
});

test.describe("pay", () => {
  test("each month is paid on its last day; a month begun part-way through is paid pro rata", () => {
    // From Thu 15 Oct at $3,100 a month: 17 of October's 31 days, then all of November. December hasn't closed.
    const p = payPeriods(new Date(2026, 9, 15), new Date(2026, 11, 10), 3100);
    expect(p.map((x) => [x.from.getDate(), x.to.getMonth(), x.to.getDate(), x.amount])).toEqual([
      [15, 9, 31, 1700],
      [1, 10, 30, 3100],
    ]);
  });

  test("ending pays the part-month too", () => {
    const p = payPeriods(new Date(2026, 11, 1), new Date(2026, 11, 10), 3100, true);
    expect(p.map((x) => [x.to.getDate(), x.amount])).toEqual([[10, 1000]]);
  });

  test("the next payday follows what's been paid", () => {
    expect(nextPay(new Date(2026, 9, 15), undefined, 3100)).toMatchObject({ amount: 1700, to: new Date(2026, 9, 31) });
    expect(nextPay(new Date(2026, 9, 15), new Date(2026, 9, 31), 3100)).toMatchObject({ amount: 3100, to: new Date(2026, 10, 30) });
  });
});
