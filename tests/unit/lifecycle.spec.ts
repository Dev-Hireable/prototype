import { expect, test } from "@playwright/test";
import { isEndedStatus, lifecycleOf, needsAttention, nextPay, NOTICE_DAYS, noticeLastDay, payPeriods, statusOf, trialClosed, type ContractFacts } from "../../src/lib/contract/lifecycle";
import { daysLeftLabel, reviewQuarter, trialClock } from "../../src/lib/portal/dates";

/** Friday 25 Sep 2026, 9 AM — the tests' today. */
const NOW = new Date(2026, 8, 25, 9);
const trial = (over: Partial<ContractFacts> = {}): ContractFacts => ({ startedAs: "trial", started: "2026-09-21", ends: "2026-10-30", evaluated: false, trialDone: false, ...over });
const direct = (over: Partial<ContractFacts> = {}): ContractFacts => ({ startedAs: "full-time", started: "2026-09-01", evaluated: false, trialDone: false, ...over });
const offer = (status: "sent" | "accepted" | "declined" | "withdrawn" | "expired", start = "2026-09-28") => ({ type: "full-time" as const, status, start });

test.describe("the trial clock", () => {
  test("counts its first and last days, and runs through the last one", () => {
    // Mon 21 Sep – Fri 30 Oct is six weeks: thirty working days. What's left is the days after today,
    // so the day and what's left add up to the length: Day 5 of 30, 25 left.
    expect(trialClock("2026-09-21", "2026-10-30", NOW)).toEqual({ label: "Day 5 of 30", left: 25, over: false, total: 30 });
    // Its last day still runs, with nothing after it.
    expect(trialClock("2026-09-21", "2026-09-25", NOW)).toEqual({ label: "Day 5 of 5", left: 0, over: false, total: 5 });
    expect(trialClock("2026-09-21", "2026-09-24", NOW)).toMatchObject({ label: "Day 4 of 4", left: 0, over: true });
    // On a weekend, Friday's day stands and the count still adds up.
    expect(trialClock("2026-09-21", "2026-10-30", new Date(2026, 8, 26, 9))).toMatchObject({ label: "Day 5 of 30", left: 25 });
  });

  test("what's left reads the same on every screen: working days, the last day, then closed", () => {
    expect(daysLeftLabel(25)).toBe("25 working days left");
    expect(daysLeftLabel(1)).toBe("1 working day left");
    expect(daysLeftLabel(0)).toBe("Last day");
    expect(daysLeftLabel(0, true)).toBe("Trial closed");
  });
});

test.describe("a role's review period", () => {
  test("is the first full quarter from its first day, then the quarter it's in", () => {
    // Started 21 Sep: Q3's last ten days aren't a quarter to review, so its first is Q4.
    expect(reviewQuarter("21 Sep 2026", NOW)).toBe("Q4 2026 (Oct to Dec)");
    expect(reviewQuarter("2026-10-01", NOW)).toBe("Q4 2026 (Oct to Dec)");
    expect(reviewQuarter("01 Jul 2026", NOW)).toBe("Q3 2026 (Jul to Sep)");
    // A long-running role is reviewed for the quarter it's in now.
    expect(reviewQuarter("15 Mar 2025", NOW)).toBe("Q3 2026 (Jul to Sep)");
    expect(reviewQuarter("21 Sep 2026", new Date(2027, 1, 3))).toBe("Q1 2027 (Jan to Mar)");
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

  test("a running trial needs attention once anything is overdue or sent back for changes", () => {
    const l = lifecycleOf(trial(), NOW);
    const item = { status: "todo" as const, due: "2026-10-02" };
    expect(statusOf(l, "independent", needsAttention([item], NOW))).toEqual({ label: "On track", tone: "ok" });
    expect(needsAttention([{ ...item, due: "2026-09-23" }], NOW)).toBe(true);
    expect(needsAttention([{ ...item, status: "doing" as const, changes: { note: "Tighten it", at: "23 Sep 2026", by: "Alex Rivera" } }], NOW)).toBe(true);
    // Done, or put away, it no longer counts.
    expect(needsAttention([{ ...item, due: "2026-09-23", status: "done" as const }, { ...item, due: "2026-09-23", archivedAt: 1 }], NOW)).toBe(false);
    expect(statusOf(l, "team", true)).toEqual({ label: "Needs attention", tone: "warn" });
    // Only a running trial says so: after it, the status is about the evaluation.
    expect(statusOf(lifecycleOf(trial({ ends: "2026-09-24" }), NOW), "team", true).label).toBe("Evaluation due");
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
});

test.describe("the lifecycle · decided, hired and ended", () => {
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

  test("cancelled before its first day reads Cancelled, not Ended, and no evaluation is ever due", () => {
    // A trial that was due to start 1 Sep, called off before then: long past its evaluation window.
    const called = lifecycleOf(trial({ started: "2026-09-01", ends: "2026-09-10", ended: true, endedOn: "28 Aug 2026", cancelled: true }), NOW);
    expect(called).toMatchObject({ phase: "ended", cancelled: true });
    expect(called.trial).toMatchObject({ day: "Cancelled", evaluationOverdue: false });
    expect(statusOf(called, "team")).toEqual({ label: "Cancelled", tone: "neutral" });
    expect(statusOf(lifecycleOf(direct({ ended: true, cancelled: true }), NOW), "independent").label).toBe("Cancelled");
    // The role a trial converted into, called off before it began: the trial stands as it closed.
    const role = lifecycleOf(trial({ ends: "2026-09-18", evaluated: true, conversion: offer("accepted", "2026-10-01"), ended: true, cancelled: true }), NOW);
    expect(role.trial?.day).toBe("Ended 18 Sep 2026");
    expect(isEndedStatus(statusOf(role, "team"))).toBe(true);
    expect(isEndedStatus(statusOf(lifecycleOf(direct(), NOW), "team"))).toBe(false);
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
