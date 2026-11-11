import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The design system's rules that can be checked on the source (docs/design-system.md):
 *   - the kit (src/components/kit) knows nothing about Hireable's data, so it ports as a folder;
 *   - a kit component lives in the file named after it and is imported from that file;
 *   - a kit component is defined once, so a screen can't grow its own Button, Select or Page;
 *   - a colour the theme has a token for is written as the token, never as its hex;
 *   - a text style that has a name in styles.ts is written as the name;
 *   - a blue link is the kit's TextLink, not a class string of its own.
 *
 * The shadcn primitives the kit wraps (components/ui) and the code ported unchanged from the real
 * app (web-app, the onboarding quiz) are outside the system, and so outside these checks.
 */
const ROOT = join(__dirname, "..", "..");
const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const slashed = (f: string) => f.split("\\").join("/");

const KIT_DIR = "src/components/kit/";
const KIT = files(KIT_DIR).map(slashed);
/** Every file a screen is drawn from: the components and the routes, less what's outside the system. */
const SCREENS = [...files("src/components"), ...files("src/app")].map(slashed).filter((f) => !/^src\/components\/ui\/|\/onboarding\//.test(f));
/** What a file imports from inside the project: aliased and relative paths. */
const importsOf = (f: string) => [...read(f).matchAll(/from "(@\/[^"]+|\.[^"]+)"/g)].map((m) => m[1]);

test("the kit knows nothing about Hireable's data", () => {
  // Other kit files, the shadcn primitives, the icons, and the helpers every screen shares: nothing
  // from a portal, the workspace, or the contract, dispute and demo stores.
  const allowed = /^@\/components\/kit\/|^@\/components\/ui\/|^@\/components\/icons$|^@\/lib\/portal\/|^@\/lib\/utils$/;
  for (const f of KIT) expect(importsOf(f).filter((i) => !allowed.test(i)), `${f} reaches outside the kit`).toEqual([]);
});

test("a kit component is imported from its own file", () => {
  // No barrel: Next parses every module a barrel re-exports to import one name from it.
  for (const name of ["index.ts", "index.tsx"]) expect(existsSync(join(ROOT, KIT_DIR, name)), `${KIT_DIR}${name}`).toBe(false);
  for (const f of KIT) expect(read(f), `${f} re-exports another module`).not.toMatch(/^export (\*|\{[^}]*\}) from /m);
  // Files are named for what they hold, in kebab-case, flat in the one folder.
  for (const f of KIT) expect(f.slice(KIT_DIR.length), f).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*\.tsx?$/);
});

/** The kit's main components: each is defined in the kit and nowhere else. */
const ONE_OF_EACH = ["Page", "Button", "LinkButton", "TextLink", "Card", "EmptyState", "InfoBanner", "Badge", "Chip", "Avatar", "Field", "Input", "Textarea", "SearchBox", "Checkbox", "Pills", "Tabs", "Table", "Toolbar", "Pagination", "Modal", "Drawer", "Toast", "Select", "KebabMenu"];

test("a kit component is defined once", () => {
  const defines = new RegExp(`^(?:export )?(?:function|const|class) (${ONE_OF_EACH.join("|")})\\b`, "gm");
  const homes = new Map<string, string[]>();
  for (const f of SCREENS) for (const m of read(f).matchAll(defines)) homes.set(m[1], [...(homes.get(m[1]) ?? []), f]);
  for (const name of ONE_OF_EACH) {
    const at = homes.get(name) ?? [];
    expect(at.length, `${name} is defined in ${at.join(", ") || "no file"}`).toBe(1);
    expect(at[0], `${name} belongs in the kit`).toMatch(new RegExp(`^${KIT_DIR}`));
  }
});

test("a colour that has a token is written as the token", () => {
  const css = read("src/app/globals.css");
  // The portals' own theme block: the first one. The ported quiz's tokens follow it in a second.
  const start = css.indexOf("@theme inline");
  const theme = css.slice(start, css.indexOf("\n}", start));
  /** hex → the token that names it; the root variables a token reads through are followed. */
  const root = new Map([...css.matchAll(/^\s*--([\w-]+):\s*(#[0-9a-f]{6})\b/gim)].map((m) => [m[1], m[2].toLowerCase()]));
  const tokens = new Map<string, string>();
  for (const m of theme.matchAll(/--color-([\w-]+):\s*(?:(#[0-9a-f]{6})|var\(--([\w-]+)[,)])/gi)) {
    const hex = (m[2] ?? root.get(m[3]))?.toLowerCase();
    if (hex && !tokens.has(hex)) tokens.set(hex, m[1]);
  }
  expect(tokens.size).toBeGreaterThan(20);
  for (const f of SCREENS) {
    // In a class: `bg-[#e5e5e5]`, or inside an arbitrary value, `shadow-[inset_0_1px_0_#e3e8ed]`.
    for (const m of read(f).matchAll(/[\w:-]*\[[^\]\s"'`]*?(#[0-9a-f]{6})\b[^\]\s"'`]*\]/gi)) {
      const token = tokens.get(m[1].toLowerCase());
      expect(token, `${f}: ${m[0]} is the token "${token}"`).toBeUndefined();
    }
  }
});

test("a text style that has a name is written as the name", () => {
  const styles = read(`${KIT_DIR}styles.ts`);
  const named = [...styles.matchAll(/export const (TEXT_\w+) = "([^"]+)";/g)].map((m) => ({ name: m[1], classes: m[2] }));
  expect(named.length).toBeGreaterThanOrEqual(4);
  for (const f of SCREENS) {
    if (f === `${KIT_DIR}styles.ts`) continue;
    const src = read(f);
    for (const { name, classes } of named) expect(src.includes(`"${classes}"`), `${f} spells out ${name}`).toBe(false);
  }
});

test("a blue link is a TextLink", () => {
  // A link blue and an underline on hover in one class string: a link drawn by hand. A `group-hover:`
  // pair (a name that turns blue with its row) is not one.
  const blue = String.raw`(?<![-\w:])text-(?:primary|accent|accent-ink)\b`;
  const hover = String.raw`(?<![-\w])hover:underline\b`;
  const quoted = "[^\"`]*";
  const byHand = new RegExp(`${blue}${quoted}${hover}|${hover}${quoted}${blue}`);
  for (const f of SCREENS) {
    if (f === `${KIT_DIR}text-link.tsx`) continue;
    const found = read(f).match(byHand)?.[0];
    expect(found, `${f} draws its own link ("${found}"): use TextLink`).toBeUndefined();
  }
});
