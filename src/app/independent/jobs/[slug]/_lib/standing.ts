import type { Posting } from "@/lib/demo/deal";
import type { useApplications } from "@/lib/independent/applications";
import type { Role } from "@/lib/independent/data";

/** What's on file for the talent, as useApplications gives it. */
type OnFile = Pick<ReturnType<typeof useApplications>, "applications" | "withdrawnRoleSlugs" | "declinedRoleSlugs" | "engagement">;

/**
 * Where the talent stands with the role: the application on file, or what keeps them from applying
 * — and so what the apply button says, and which notes under it say why.
 */
export function standingOn(role: Role, posting: Posting, { applications, withdrawnRoleSlugs, declinedRoleSlugs, engagement }: OnFile) {
  const application = applications.find((a) => a.roleSlug === role.slug);
  const applied = !!application;
  const withdrawn = withdrawnRoleSlugs.includes(role.slug);
  /** Turned down here before, and that application has since been replaced by another. */
  const declined = !applied && declinedRoleSlugs.includes(role.slug);
  const closed = !!posting.closed;
  /**
   * One engagement at a time: while one is on file for another role, this one can't be applied
   * to. Applying used to overwrite it — contract, escrow record and evaluation included.
   */
  const engagedElsewhere = !applied && engagement && engagement.roleSlug !== role.slug ? engagement : null;
  const blocked = applied || withdrawn || declined || role.filled || closed || !!engagedElsewhere;
  const cta = withdrawn ? "Withdrawn" : declined ? "Not selected" : role.filled ? "Position filled" : closed ? "Role closed" : "Apply now";
  /** The other engagement gets its note only when nothing else already keeps the role closed. */
  const engagedNote = engagedElsewhere && !withdrawn && !declined && !role.filled && !closed ? engagedElsewhere : null;
  return { application, applied, withdrawn, declined, closed, blocked, cta, engagedNote };
}

export type Standing = ReturnType<typeof standingOn>;
