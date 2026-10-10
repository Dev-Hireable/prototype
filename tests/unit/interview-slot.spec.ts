import { expect, test } from "@playwright/test";
import { offsetOfLabel, slotAt } from "../../src/lib/portal/timezones";
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
