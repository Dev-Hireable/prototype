import { expect, test } from "@playwright/test";
import { taskRefParts } from "../../src/lib/work/refs";

test.describe("task references in text", () => {
  test("a #number is a task's reference; one inside a word or an HTML entity isn't", () => {
    expect(taskRefParts("See #4 first")).toEqual([{ text: "See " }, { text: "#4", number: 4 }, { text: " first" }]);
    expect(taskRefParts("#12 and #3.")).toEqual([{ text: "#12", number: 12 }, { text: " and " }, { text: "#3", number: 3 }, { text: "." }]);
    expect(taskRefParts("C#4, &#4; and #x stay as written")).toEqual([{ text: "C#4, &#4; and #x stay as written" }]);
    expect(taskRefParts("")).toEqual([]);
  });
});
