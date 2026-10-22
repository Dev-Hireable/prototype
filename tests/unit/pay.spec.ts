import { expect, test } from "@playwright/test";
import { payFor, trialMonthly, trialTotal } from "../../src/lib/contract/job-types";

test.describe("pay · how it reads", () => {
  test("a trial's pay is one total for the whole trial, and a role's is monthly", () => {
    expect(payFor("trial", "$1,600")).toBe("$1,600 for the trial");
    expect(payFor("trial", "$1,600.00 - $2,000.00")).toBe("$1,600 to $2,000 for the trial");
    expect(payFor("full-time", "$4,000.00/mo")).toBe("$4,000 /month");
    expect(payFor("part-time", "$2,000 /month")).toBe("$2,000 /month");
  });

  test("reading it again changes nothing, and a pay with no amount passes through", () => {
    expect(payFor("trial", payFor("trial", "$1,600"))).toBe("$1,600 for the trial");
    expect(payFor("full-time", payFor("full-time", "$4,000"))).toBe("$4,000 /month");
    expect(payFor("trial", "—")).toBe("—");
  });
});

test.describe("pay · trials saved as a monthly rate", () => {
  test("read as the total they stood for, a 30-day trial keeping its number", () => {
    expect(trialTotal("$1,600 /month", 30)).toBe("$1,600");
    expect(trialTotal("$1,600 /month", 60)).toBe("$3,200");
    expect(trialTotal("$1,600.00/mo", 60)).toBe("$3,200.00");
    expect(trialTotal("$1,600.00 - $2,000.00 /mo", 90)).toBe("$4,800.00 - $6,000.00");
  });

  test("a total passes through, and compares with a monthly rate as a month of it", () => {
    expect(trialTotal("$3,200", 60)).toBe("$3,200");
    expect(trialMonthly(3200, 60)).toBe(1600);
    expect(trialMonthly(1600, 30)).toBe(1600);
  });
});
