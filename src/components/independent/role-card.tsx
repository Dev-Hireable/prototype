"use client";

import Link from "next/link";
import { ICONS } from "@/components/icons";
import { Button, Chip, Initials, JobBadge, LinkButton, MatchPill } from "@/components/portal/ui";
import { hoursLabel, payFor } from "@/lib/contract/job-types";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import type { Application, Role } from "@/lib/independent/data";
import { useSavedRoles } from "@/lib/independent/saved";
import { useApplications } from "@/lib/independent/applications";
import { useWithReturn } from "@/components/portal/return";
import { toggleSavedWithNote } from "@/components/portal/notify";

const Bookmark = ICONS.saved;
const Bookmarked = ICONS.bookmark;

/**
 * A role on Discover or Saved roles: the save toggle (unsaving says so, with Undo), then View role,
 * or on Saved roles the application already on file, or why the role is closed to them.
 */
export function RoleCard({ role, variant = "discover" }: { role: Role; variant?: "discover" | "saved" }) {
  const { applications, withdrawnRoleSlugs, declinedRoleSlugs } = useApplications();
  const { saved, savedOn, toggleSaved } = useSavedRoles();
  const isSaved = saved.includes(role.slug);
  const application = applications.find((a) => a.roleSlug === role.slug);
  const withdrawn = withdrawnRoleSlugs.includes(role.slug);
  const declined = !application && declinedRoleSlugs.includes(role.slug);
  const withReturn = useWithReturn();
  /** From Saved roles the next page leads back there; from Discover the role page's own link already does. */
  const out = (href: string) => (variant === "saved" ? withReturn(href) : href);

  return (
    <article className="flex flex-col gap-3 rounded-lg bg-white p-5 outline -outline-offset-1 outline-border">
      <div className="flex items-start gap-3">
        <Initials text={role.initials} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={out(`/independent/jobs/${role.slug}`)} className="text-[18px] leading-[1.4] font-semibold text-ink hover:text-primary">
              {role.title}
            </Link>
            <JobBadge type={role.type} />
            {/* IN-012 — colour coded by band with the tooltip that explains the score. It was the
                plain gradient, which looked identical at 88% and 58%. */}
            <MatchPill pct={role.match} coded title={MATCH_TOOLTIP.independent} />
          </div>
          <p className="text-[14px] leading-[1.4] text-ink-2">
            {role.company} · {role.location}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* #82 — unsaving is the same bookmark toggle on both lists, undone from its toast; it isn't a red Remove. */}
          <SaveToggle isSaved={isSaved} onToggle={() => toggleSavedWithNote(role.title, isSaved, () => toggleSaved(role.slug))} />
          {variant === "saved" ? <SavedAction role={role} application={application} closed={closedLabel(role, withdrawn, declined)} out={out} /> : <ViewRole href={`/independent/jobs/${role.slug}`} />}
        </div>
      </div>
      <p className="text-[14px] leading-[1.4] text-ink-2">{metaLine(role, variant === "saved" ? savedOn[role.slug] : undefined)}</p>
      <p className="text-[14px] leading-[1.4] text-ink">{role.blurb}</p>
      <div className="flex flex-wrap gap-2">
        {role.skills.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </article>
  );
}

/** The bookmark: saved or not, the same on Discover and Saved roles. */
function SaveToggle({ isSaved, onToggle }: { isSaved: boolean; onToggle: () => void }) {
  const Mark = isSaved ? Bookmarked : Bookmark;
  return (
    <button type="button" aria-label={isSaved ? "Unsave role" : "Save role"} aria-pressed={isSaved} onClick={onToggle} className="flex size-7 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary">
      <Mark size={16} aria-hidden />
    </button>
  );
}

/** #83 — every role card opens the role with "View role"; applying is the role page's "Apply now". */
function ViewRole({ href }: { href: string }) {
  return (
    <LinkButton size="sm" variant="primary" href={href}>
      View role
    </LinkButton>
  );
}

/** Saved roles: the application on file, a disabled button saying why the role is closed to them, or View role. */
function SavedAction({ role, application, closed, out }: { role: Role; application: Application | undefined; closed: string | null; out: (href: string) => string }) {
  // A saved role that has already been applied to opens that application.
  if (application)
    return (
      <LinkButton size="sm" variant="primary" href={out(`/independent/jobs/applications/${application.id}`)}>
        View application
      </LinkButton>
    );
  if (closed)
    return (
      <Button size="sm" disabled>
        {closed}
      </Button>
    );
  return <ViewRole href={out(`/independent/jobs/${role.slug}`)} />;
}

/** The line under the title: the pay, the level and when it was posted, or on Saved roles when it was saved (`savedOn`). */
function metaLine(role: Role, savedOn: string | undefined) {
  /** A part-time role says how much of the week it is, beside its pay. */
  const pay = role.type === "part-time" && role.hours ? `${payFor(role.type, role.rate)} · ${hoursLabel(role.hours)}` : payFor(role.type, role.rate);
  return [pay, role.level, savedOn ? `Saved ${savedOn}` : role.posted].filter(Boolean).join(" · ");
}

/** Why a saved role can't be applied to (withdrawn, turned down, filled), as its disabled button says it; null when it's open. */
function closedLabel(role: Role, withdrawn: boolean, declined: boolean) {
  return withdrawn ? "Withdrawn" : declined ? "Not selected" : role.filled ? "Position filled" : null;
}
