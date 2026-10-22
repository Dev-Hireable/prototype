import { expect, test } from "@playwright/test";
import { FRESH_MS, isTyping } from "../../src/lib/demo/typing";

// Typing dots (src/lib/demo/typing.ts): a side counts as typing for a few seconds after its last keystroke.

test.describe("typing dots", () => {
  test("a recent keystroke counts as typing, an old one doesn't, and a side that hasn't typed isn't", () => {
    const now = 1_000_000;
    expect(isTyping({ independent: now - 500 }, "independent", now)).toBe(true);
    expect(isTyping({ independent: now - FRESH_MS }, "independent", now)).toBe(false);
    expect(isTyping({ independent: now - 500 }, "team", now)).toBe(false);
    expect(isTyping({}, "team", now)).toBe(false);
  });
});
