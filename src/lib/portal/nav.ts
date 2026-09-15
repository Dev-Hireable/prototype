import type { IconName } from "@/components/admin/icons";

export type MenuItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Confirm before following the link — logout is the only one so far. */
  action?: "logout";
};

export type Section = {
  href: string;
  label: string;
  title: string;
  /** Material glyph, or "logo" for the Hireable mark (Job Board in the Independent portal). */
  icon: IconName | "logo";
  menu: MenuItem[];
  /** Not shown in the rail — reached from the avatar (Profile). */
  hidden?: boolean;
};

/** Longest matching section prefix wins, so detail routes keep their section open. */
export function sectionFor(sections: Section[], pathname: string): Section {
  return (
    [...sections]
      .sort((a, b) => b.href.length - a.href.length)
      .find((s) => pathname === s.href || pathname.startsWith(s.href + "/")) ?? sections[0]
  );
}

/** Longest matching menu prefix, so a detail route keeps its list item highlighted. */
export function menuItemFor(section: Section, pathname: string): string | undefined {
  return [...section.menu]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => pathname === m.href || pathname.startsWith(m.href + "/"))?.href;
}
