import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, posix, sep } from "node:path";

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
 *
 * And the boundaries that let each part move on its own:
 *   - a portal imports nothing from another portal's folders, and shared code nothing from any portal's;
 *   - the pure rules import only each other, never the demo backend;
 *   - no import loops, type imports included.
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

/* ------------------------------------------------------------------ the import graph --- */

const SRC = new Set(files("src").map((f) => f.split(sep).join("/")));

/** The src file an import names; null for a package, or for a file that isn't code (CSS, JSON). */
function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(from), spec) : null;
  if (base === null) return null;
  return ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find((f) => SRC.has(f)) ?? null;
}

/**
 * The src files a file imports, types included. An `import()` isn't counted: it's how the dispute
 * store calls the contract store back, lazily, once a dispute about a role closes.
 */
const IMPORT = /^(?:import|export)(?:\s+type)?\s+[\w*\s{},]*?\s*from\s+["']([^"']+)["']|^import\s+["']([^"']+)["']/gm;
function importsOf(f: string): string[] {
  const reached = [...read(f).matchAll(IMPORT)].map((m) => resolve(f, m[1] ?? m[2]));
  return [...new Set(reached.filter((t): t is string => t !== null))];
}

/** Every group of files that reach each other through their imports (Tarjan's strongly connected components). */
function loops(graph: Map<string, string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const found: string[][] = [];
  const visit = (v: string) => {
    index.set(v, index.size);
    low.set(v, index.get(v)!);
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) visit(w);
      if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, low.get(w)!));
    }
    if (low.get(v) !== index.get(v)) return;
    const group: string[] = [];
    let w: string;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      group.push(w);
    } while (w !== v);
    if (group.length > 1 || graph.get(v)!.includes(v)) found.push(group);
  };
  for (const v of graph.keys()) if (!index.has(v)) visit(v);
  return found;
}

/** Each portal's own folders. Everything else is shared by the portals, or is the app's frame. */
const PORTALS = ["team", "independent", "admin"];
const portalOf = (f: string) => PORTALS.find((p) => [`src/app/(main)/${p}/`, `src/components/${p}/`, `src/lib/${p}/`].some((dir) => f.startsWith(dir)));

test("a portal imports nothing from another portal's folders", () => {
  for (const f of SRC) {
    const own = portalOf(f);
    if (own) expect(importsOf(f).filter((t) => portalOf(t) && portalOf(t) !== own), f).toEqual([]);
  }
});

/** What every portal draws and runs on. lib/demo, the stand-in backend, serves both portals from their own data. */
const SHARED = ["src/components/portal/", "src/components/workspace/", "src/components/ui/", "src/components/icons.ts", "src/lib/portal/", "src/lib/work/", "src/lib/contract/", "src/lib/disputes/"];

/** Where shared code still reads a portal's own files, and why. */
const READS_A_PORTAL: Record<string, string[]> = {
  // A chat line opens the proposal it quotes in that side's own dialog, so it knows both portals.
  "src/components/portal/chat-source-link.tsx": [
    "src/components/independent/application-proposal-dialog.tsx",
    "src/components/team/proposal-review-dialog.tsx",
    "src/lib/independent/applications.ts",
    "src/lib/team/deal-view.ts",
    "src/lib/team/pipeline.ts",
    "src/lib/team/roles.ts",
  ],
};

test("shared code imports nothing from a portal's folders", () => {
  for (const f of SRC) {
    if (SHARED.some((dir) => f.startsWith(dir))) expect(importsOf(f).filter((t) => portalOf(t)).sort(), f).toEqual(READS_A_PORTAL[f] ?? []);
  }
});

/** The pure rules: no React, no browser, and nothing but each other, so they run here as they are. */
const PURE = [
  ...["dates", "model", "validate", "permissions", "order", "query", "calendar", "timeline", "workload", "migrate", "errors", "overlay", "repository", "agenda", "projects"].map((n) => `src/lib/work/${n}.ts`),
  ...["lifecycle", "job-types", "agreement", "fit-score"].map((n) => `src/lib/contract/${n}.ts`),
  "src/lib/disputes/case.ts",
  "src/lib/portal/dates.ts",
];

test("the pure rules import only each other, never the demo backend", () => {
  for (const f of PURE) {
    expect(read(f), f).not.toMatch(/from "react"|from "@\/|"use client"|window\.|localStorage|document\./);
    expect(importsOf(f).filter((t) => !PURE.includes(t)), f).toEqual([]);
  }
});

test("no files import each other in a loop, type imports included", () => {
  expect(loops(new Map([...SRC].map((f) => [f, importsOf(f)])))).toEqual([]);
});
