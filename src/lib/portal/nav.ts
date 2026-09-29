/**
 * The glyphs the rails and menus use. PortalShell draws each one from the icon set
 * (src/components/icons.ts), so a name it has no glyph for fails to compile there.
 */
export type NavIcon =
  | "home" | "dashboard" | "messages" | "bell" | "explore" | "search" | "saved" | "edit" | "roles" | "contracts" | "document" | "interviews"
  | "people" | "person" | "users" | "applications" | "payment" | "billing" | "wallet" | "card" | "disputes" | "history" | "chart"
  | "content" | "marketing" | "subscriptions" | "business" | "settings" | "account" | "security" | "logout";

export type MenuItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Confirm before following the link — logout is the only one so far. */
  action?: "logout";
  /** Other paths that belong to this item — a detail route that lives elsewhere. */
  match?: string[];
  /** No page panel around it: the page draws its own panels beside the section panel (Messages). */
  bare?: boolean;
};

export type Section = {
  href: string;
  label: string;
  title: string;
  /** Material glyph, or "logo" for the Hireable mark (Job Board in the Independent portal). */
  icon: NavIcon | "logo";
  menu: MenuItem[];
  /** Not shown in the rail — reached from the avatar (Profile). */
  hidden?: boolean;
  /** Other paths that belong to this section — a detail route that lives elsewhere. */
  match?: string[];
};

const within = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

/** The longest of `hrefs` that `pathname` is at or under, or 0. */
const depth = (pathname: string, hrefs: string[]) => Math.max(0, ...hrefs.filter((h) => within(pathname, h)).map((h) => h.length));

/** Longest matching section prefix wins, so detail routes keep their section open. */
export function sectionFor(sections: Section[], pathname: string): Section {
  let best: Section | undefined;
  let at = 0;
  for (const s of sections) {
    const d = depth(pathname, [s.href, ...(s.match ?? [])]);
    if (d > at) {
      best = s;
      at = d;
    }
  }
  return best ?? sections[0];
}

/** Longest matching menu prefix, so a detail route keeps its list item highlighted. */
export function menuItemFor(section: Section, pathname: string): string | undefined {
  let best: string | undefined;
  let at = 0;
  for (const m of section.menu) {
    const d = depth(pathname, [m.href, ...(m.match ?? [])]);
    if (d > at) {
      best = m.href;
      at = d;
    }
  }
  return best;
}
