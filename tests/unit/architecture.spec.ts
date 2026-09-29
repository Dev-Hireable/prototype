import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, sep } from "node:path";

/**
 * The lines the workspace's design depends on, checked on the source:
 *   - the workspace reads work through the work store only — never a portal's own store — so the
 *     admin portal (which has neither) can render it, and no page can hand it a stale copy;
 *   - work items change through the repository only: nothing outside src/lib/work writes the
 *     task list through the deal's general-purpose updater;
 *   - the domain layer is pure: no React, no browser, no app aliases, so it runs in these tests.
 *
 * And the layout the real app (Web-App apps/web) keeps, so code moves there as a copy:
 *   - lib/ imports nothing from components/ or app/;
 *   - a route folder holds only Next's own files, and a route's parts sit in private _folders;
 *   - file names are kebab-case.
 */
const ROOT = join(__dirname, "..", "..");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : /\.(tsx?|jsx?)$/.test(e.name) ? [join(dir, e.name)] : []));
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

test("the workspace doesn't reach into a portal's own store", () => {
  for (const f of files("src/components/workspace")) {
    const src = read(f);
    expect(src, f).not.toMatch(/@\/lib\/(team|independent)\/store/);
    expect(src, f).not.toMatch(/\buseDemo\(/);
  }
});

test("work items change through the repository only", () => {
  for (const f of files("src")) {
    const src = read(f);
    // The strict, all-or-nothing save is the repository's port; nothing else uses it.
    if (!f.endsWith(join("lib", "work", "store.ts")) && !f.endsWith(join("lib", "demo", "deal.ts"))) expect(src, f).not.toMatch(/\btransactDeal\(/);
    // The old per-portal write path is gone for good.
    expect(src, f).not.toMatch(/task-actions|taskApi\(|rulesFor\(/);
  }
});

test("dispute rules are pure, and only the dispute store saves disputes", () => {
  expect(read(join("src", "lib", "disputes", "case.ts"))).not.toMatch(/from "react"|from "@\/|"use client"|window\.|localStorage|document\./);
  for (const f of files("src")) if (!f.endsWith(join("lib", "demo", "disputes.ts"))) expect(read(f), f).not.toMatch(/hireable\.demo\.disputes/);
});

test("the contract lifecycle is pure, and only its store moves the lifecycle's money", () => {
  expect(read(join("src", "lib", "contract", "lifecycle.ts"))).not.toMatch(/from "react"|from "@\/|"use client"|window\.|localStorage|document\./);
  // The stores and pages ask it to end, evaluate and pay; none of them writes `paidThrough` or `trialScore` itself.
  const allowed = [join("lib", "demo", "contract.ts"), join("lib", "demo", "deal.ts"), join("lib", "contract", "lifecycle.ts")];
  for (const f of files("src")) if (!allowed.some((a) => f.endsWith(a))) expect(read(f), f).not.toMatch(/paidThrough:|trialScore:/);
});

test("the domain layer is pure", () => {
  const pure = ["dates", "model", "validate", "permissions", "order", "query", "calendar", "timeline", "workload", "migrate", "errors", "overlay", "repository"];
  for (const name of pure) {
    const src = read(join("src", "lib", "work", `${name}.ts`));
    expect(src, name).not.toMatch(/from "react"|from "@\/|"use client"|window\.|localStorage|document\./);
  }
});

test("lib imports nothing from components or app", () => {
  for (const f of files(join("src", "lib"))) {
    const reached = [...read(f).matchAll(/from ["'](@\/(?:components|app)\/[^"']+)["']/g)].map((m) => m[1]);
    // The one exception: the demo backend reads the real app's quiz script where the ported
    // onboarding keeps it, so that folder stays the real app's, file for file.
    const allowed = f.endsWith(join("lib", "demo", "work-style.ts")) ? ["@/app/(main)/onboarding/_data/quiz-config"] : [];
    expect(reached, f).toEqual(allowed);
  }
});

/** Next's own file names: all a route folder holds outside a private _folder. */
const NEXT_FILE = /^(page|layout|template|default|loading|error|global-error|not-found|route|icon|apple-icon|opengraph-image|twitter-image|sitemap|robots|manifest)\.tsx?$/;

test("route folders hold only Next's own files; a route's parts sit in private _folders", () => {
  for (const f of files(join("src", "app"))) {
    const inPrivateFolder = f.split(sep).some((part) => part.startsWith("_"));
    if (!inPrivateFolder) expect(basename(f), f).toMatch(NEXT_FILE);
  }
});

test("file names are kebab-case", () => {
  for (const f of files("src")) expect(basename(f), f).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)+$/);
});
