import { expect, test } from "@playwright/test";
import { readableRefs, taskLinkAt, taskLinkHtml, taskOf, taskRefParts, tasksNamed } from "../../src/lib/work/refs";

const LINK = "http://localhost:3000/team/independents/juan-dela-cruz?task=t-type";
const TASKS = [
  { id: "t-type", number: 4, title: "Pick a typography pairing" },
  { id: "t-kickoff", number: 6, title: "Kickoff call" },
];

test.describe("task references in text", () => {
  test("a #number is a task's reference; one inside a word or an HTML entity isn't", () => {
    expect(taskRefParts("See #4 first")).toEqual([{ text: "See " }, { text: "#4", number: 4 }, { text: " first" }]);
    expect(taskRefParts("#12 and #3.")).toEqual([{ text: "#12", number: 12 }, { text: " and " }, { text: "#3", number: 3 }, { text: "." }]);
    expect(taskRefParts("C#4, &#4; and #x stay as written")).toEqual([{ text: "C#4, &#4; and #x stay as written" }]);
    expect(taskRefParts("")).toEqual([]);
  });

  test("a pasted task link names its task by id; the full stop after it isn't part of it, and other links stay as written", () => {
    expect(taskRefParts(`Could you check ${LINK}.`)).toEqual([{ text: "Could you check " }, { text: LINK, taskId: "t-type" }, { text: "." }]);
    expect(taskRefParts("See https://example.com/page#4 and https://example.com/?q=1")).toEqual([{ text: "See https://example.com/page#4 and https://example.com/?q=1" }]);
    expect(taskRefParts(`(${LINK}) then #6`)).toEqual([{ text: "(" }, { text: LINK, taskId: "t-type" }, { text: ") then " }, { text: "#6", number: 6 }]);
  });
});

test.describe("task references · the tasks they name", () => {
  test("a reference is a task on the contract by its number or its link's id, each named once for the cards, three at most", () => {
    const parts = taskRefParts(`${LINK} #4 #6 #99`);
    expect(parts.map((p) => taskOf(p, TASKS)?.id)).toEqual(["t-type", undefined, "t-type", undefined, "t-kickoff", undefined, undefined]);
    expect(tasksNamed(parts, TASKS).map((t) => t.number)).toEqual([4, 6]);
    expect(tasksNamed(taskRefParts("#4 #6"), TASKS, 1).map((t) => t.number)).toEqual([4]);
  });

  test("a notification reads a pasted link as the task's number and name; a link to no task here stays", () => {
    expect(readableRefs(`Could you check ${LINK}?`, TASKS)).toBe("Could you check #4 Pick a typography pairing?");
    expect(readableRefs("http://localhost:3000/x?task=gone and #4", TASKS)).toBe("http://localhost:3000/x?task=gone and #4");
  });

  test("Copy link makes the contract page's link to the task, and a formatted copy named after it", () => {
    const url = taskLinkAt({ origin: "http://localhost:3000", pathname: "/team/independents/juan-dela-cruz" }, "t-type");
    expect(url).toBe(LINK);
    expect(taskRefParts(url)).toEqual([{ text: LINK, taskId: "t-type" }]);
    expect(taskLinkHtml(url, '#4 Fonts & "pairs" <draft>')).toBe(`<a href="${LINK}">#4 Fonts &amp; &quot;pairs&quot; &lt;draft&gt;</a>`);
  });
});
