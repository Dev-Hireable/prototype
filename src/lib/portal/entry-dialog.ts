import type { Side } from "@/lib/work/model";

/**
 * What a thread entry's View details opens over the chat instead of leaving it: the proposal or the
 * offer the step is about. Read from where the entry points, so entries saved before this open the
 * same way: the old offer pages (…/offer) count too.
 *
 *   proposal    the proposal dialog (`?proposal=1` on the candidate or the application)
 *   offer       a trial offer (the TB's sent offer; the IN's offer to sign)
 *   hire-offer  the post-trial offer on the Independent's contract (`?offer=open`)
 */
export type EntryDialog = { kind: "proposal" | "offer"; slug?: string; app?: string } | { kind: "hire-offer"; slug: string };

export function entryDialogOf(href: string, side: Side): EntryDialog | null {
  const [path, query = ""] = href.split("?");
  const q = new URLSearchParams(query);
  if (side === "team") {
    const candidate = /^\/team\/hire\/roles\/([^/]+)\/candidates\/[^/]+$/.exec(path);
    if (!candidate) return null;
    if (q.get("proposal") === "1") return { kind: "proposal", slug: candidate[1] };
    return q.get("offer") === "1" ? { kind: "offer", slug: candidate[1] } : null;
  }
  const application = /^\/independent\/jobs\/applications\/([^/]+?)(\/offer)?$/.exec(path);
  if (application) {
    if (application[2] || q.get("offer") === "1") return { kind: "offer", app: application[1] };
    return q.get("proposal") === "1" ? { kind: "proposal", app: application[1] } : null;
  }
  const contract = /^\/independent\/contracts\/([^/]+?)(\/offer)?$/.exec(path);
  return contract && (contract[2] || q.get("offer") === "open") ? { kind: "hire-offer", slug: contract[1] } : null;
}
