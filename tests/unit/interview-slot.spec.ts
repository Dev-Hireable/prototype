import { expect, test } from "@playwright/test";
import { bothClocks, offsetOfLabel, slotAt, slotClocks } from "../../src/lib/portal/timezones";
import { canJoin, isUpcoming, trialLength, workingDaysLabel } from "../../src/lib/portal/dates";
import { signatureMatches } from "../../src/lib/portal/names";
import { threadStage } from "../../src/lib/portal/stages";

test.describe("interview slots · both people's clocks (#153)", () => {
  test("a slot booked in Manila reads in another zone's clock, across midnight too", () => {
    const manila = offsetOfLabel("(GMT+8) Manila");
    expect(manila).toBe(480);
    expect(offsetOfLabel("(GMT+5:30) Kolkata")).toBe(330);
    expect(slotAt("Tue 29 Sep 2026, 10:00 AM", manila, manila)).toBe("Tue 29 Sep, 10:00 AM");
    expect(slotAt("Tue 29 Sep 2026, 10:00 AM", manila, 330)).toBe("Tue 29 Sep, 7:30 AM");
    expect(slotAt("Tue 29 Sep 2026, 10:00 AM", manila, -420)).toBe("Mon 28 Sep, 7:00 PM");
    expect(slotAt("Tue 29 Sep 2026, 12:15 PM", manila, manila)).toBe("Tue 29 Sep, 12:15 PM");
  });

  test("a slot that isn't a date and time is left alone", () => {
    expect(slotAt("next week sometime", 480, 0)).toBeUndefined();
    expect(bothClocks("next week sometime", 480, 0, { offset: 480, first: "Juan" })).toBe("next week sometime");
  });

  test("each side reads the slot in its own clock, with the other's beside it", () => {
    const newYork = -240;
    const manila = 480;
    expect(slotClocks("Tue 29 Sep 2026, 10:00 AM", newYork, newYork, manila)).toEqual({ mine: "Tue 29 Sep, 10:00 AM", theirs: "10:00 PM" });
    expect(bothClocks("Tue 29 Sep 2026, 10:00 AM", newYork, newYork, { offset: manila, first: "Juan" })).toBe("Tue 29 Sep, 10:00 AM your time · 10:00 PM Juan's time");
    expect(bothClocks("Tue 29 Sep 2026, 10:00 PM", manila, manila, { offset: newYork, first: "Alex" })).toBe("Tue 29 Sep, 10:00 PM your time · 10:00 AM Alex's time");
    // When the other clock is on another day, its time carries that day.
    expect(bothClocks("Tue 29 Sep 2026, 9:00 AM", manila, manila, { offset: newYork, first: "Alex" })).toBe("Tue 29 Sep, 9:00 AM your time · Mon 28 Sep, 9:00 PM Alex's time");
    expect(bothClocks("Tue 29 Sep 2026, 10:00 AM", manila, manila, { offset: manila, first: "Juan" })).toBe("Tue 29 Sep, 10:00 AM, your time and Juan's");
  });

  test("Join call opens 10 minutes before the slot, read in the clock it was booked in", () => {
    const start = Date.UTC(2026, 8, 29, 2, 0); // 10:00 AM in Manila
    expect(canJoin("Tue 29 Sep 2026, 10:00 AM", 480, start - 11 * 60_000)).toBe(false);
    expect(canJoin("Tue 29 Sep 2026, 10:00 AM", 480, start - 10 * 60_000)).toBe(true);
    expect(canJoin("Tue 29 Sep 2026, 10:00 AM", 480, start + 61 * 60_000)).toBe(false);
    // A slot saved before bookings kept their clock says "(PHT)": it was picked in Manila's.
    expect(canJoin("Tue 29 Sep 2026, 10:00 AM (PHT)", undefined, start)).toBe(true);
    expect(isUpcoming("Tue 29 Sep 2026, 10:00 AM", 480, start - 1)).toBe(true);
    expect(isUpcoming("Tue 29 Sep 2026, 10:00 AM", 480, start)).toBe(false);
  });
});

test.describe("trial length and signatures · one wording everywhere", () => {
  test("a trial's length says it counts working days", () => {
    expect(workingDaysLabel(30)).toBe("30 working days");
    expect(trialLength(30)).toBe("30 working days (about 6 weeks)");
    expect(trialLength(60)).toBe("60 working days (about 12 weeks)");
    expect(trialLength(90)).toBe("90 working days (about 18 weeks)");
  });

  test("a signature is the account's full name, whatever its case or spacing", () => {
    expect(signatureMatches("Juan Dela Cruz", "Juan Dela Cruz")).toBe(true);
    expect(signatureMatches("  juan  dela CRUZ ", "Juan Dela Cruz")).toBe(true);
    expect(signatureMatches("Juan D.", "Juan Dela Cruz")).toBe(false);
    expect(signatureMatches("", "")).toBe(false);
  });
});

test.describe("threads · the stage tag (#152)", () => {
  test("the thread is tagged by where the engagement stands", () => {
    expect(threadStage("applied")).toBe("Applied");
    expect(threadStage("invite_accepted")).toBe("Interview");
    expect(threadStage("proposal_sent")).toBe("Proposal");
    expect(threadStage("offer_received")).toBe("Offer");
    expect(threadStage("hired", "Trial")).toBe("Trial");
  });
});
