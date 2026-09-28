"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { BreadcrumbBack } from "@/components/portal/nav";

/**
 * "Back to where I was" for pages reached through an action on another page — Message from a
 * contract, Track offer from a candidate, Open tracker from a notification. Such links carry the
 * page they were clicked on as `?from=`, and the destination shows a back link to it. Sidebar
 * navigation doesn't: going somewhere on purpose needs no way back.
 *
 * These read the URL, which a prerendered page may only do under a Suspense boundary; portal pages
 * get one from PortalShell, so no page has to add its own.
 */

/** What the back link calls each origin; anything unlisted is a plain "Back". Most specific first. */
const ORIGINS: [RegExp, string][] = [
  [/^\/team\/hire\/roles\/[^/]+\/candidates\/[^/]+$/, "candidate"],
  [/^\/team\/hire\/roles\/[^/]+$/, "pipeline"],
  [/^\/team\/hire\/interviews$/, "interviews"],
  [/^\/team\/hire\/offers$/, "offers"],
  [/^\/team\/independents\/[^/]+$/, "contract"],
  [/^\/team\/independents$/, "independents"],
  [/^\/team\/notifications$/, "notifications"],
  // "View in pipeline" leaves from these, so the board's back link can say where it goes.
  [/^\/team\/discover\/saved$/, "saved independents"],
  [/^\/team\/discover\/[^/]+$/, "profile"],
  [/^\/team\/discover$/, "Discover"],
  [/^\/team$/, "dashboard"],
  [/^\/independent\/jobs\/applications\/[^/]+$/, "application"],
  [/^\/independent\/jobs\/applications$/, "applications"],
  [/^\/independent\/jobs\/interviews$/, "interviews"],
  [/^\/independent\/jobs\/saved$/, "saved roles"],
  [/^\/independent\/contracts\/[^/]+$/, "contract"],
  [/^\/independent\/notifications$/, "notifications"],
  [/^\/independent$/, "dashboard"],
  [/^\/admin\/disputes\/[^/]+$/, "dispute"],
  [/^\/admin\/users\/independents\/[^/]+$/, "account"],
  [/^\/admin\/users\/[^/]+$/, "account"],
  [/^\/admin\/contracts\/[^/]+$/, "contract"],
];

function labelFor(path: string) {
  const hit = ORIGINS.find(([pattern]) => pattern.test(path.split("?")[0]));
  return hit ? `Back to ${hit[1]}` : "Back";
}

/**
 * For a link into another section: returns a function that adds the current page as `from`. It
 * records the full address — the open tab, the filter, and the page's own `from` — so going back
 * lands exactly where the user was, and that page can still lead back one step further.
 */
export function useWithReturn() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  return (href: string) => `${href}${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(here)}`;
}

/**
 * Where the action came from, if it's an in-app path — anything else is ignored, so a crafted link
 * can't turn the back link into a jump off-site.
 */
export function useReturnTo(): { href: string; label: string } | null {
  const from = useSearchParams().get("from");
  if (!from || !from.startsWith("/") || from.startsWith("//")) return null;
  return { href: from, label: labelFor(from) };
}

/**
 * The page's `nav` slot content: a back link to the origin when there is one, else the page's usual
 * breadcrumb or back link — or nothing. Pass it even when there's no fallback: the slot is a fixed
 * row, so reserving it keeps the page from jumping when a back link does appear.
 */
export function ReturnNav({ fallback }: { fallback?: ReactNode }) {
  const back = useReturnTo();
  return back ? <BreadcrumbBack href={back.href}>{back.label}</BreadcrumbBack> : (fallback ?? null);
}
