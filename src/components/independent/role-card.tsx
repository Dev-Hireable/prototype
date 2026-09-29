"use client";

import Link from "next/link";
import { ICONS } from "@/components/icons";
import { Button, Chip, Initials, JobBadge, LinkButton, MatchPill } from "@/components/portal/ui";
import { hoursLabel } from "@/lib/contract/job-types";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import type { Application, Role } from "@/lib/independent/data";
import { useSavedRoles } from "@/lib/independent/saved";
import { useApplications } from "@/lib/independent/applications";
import { useWithReturn } from "@/components/portal/return";

const Bookmark = ICONS.saved;
const Bookmarked = ICONS.bookmark;

/** Discover (Save + View role) and Saved roles (Remove + Apply) variants. */
export function RoleCard({ role, variant = "discover" }: { role: Role; variant?: "discover" | "saved" }) {
  const { applications, withdrawnRoleSlugs, declinedRoleSlugs, engagement } = useApplications();
  const { saved, toggleSaved } = useSavedRoles();
  const isSaved = saved.includes(role.slug);
  const application = applications.find((a) => a.roleSlug === role.slug);
  const withdrawn = withdrawnRoleSlugs.includes(role.slug);
  const declined = !application && declinedRoleSlugs.includes(role.slug);
  /** One engagement at a time — another role's is on file, so this one can't be applied to yet. */
  const engagedElsewhere = !application && !!engagement && engagement.roleSlug !== role.slug;
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
          {variant === "saved" ? (
            <SavedActions role={role} application={application} closed={closedButton(role, withdrawn, declined, engagedElsewhere, engagement?.title)} out={out} onRemove={() => toggleSaved(role.slug)} />
          ) : (
            <DiscoverActions slug={role.slug} isSaved={isSaved} onToggle={() => toggleSaved(role.slug)} />
          )}
        </div>
      </div>
      <p className="text-[14px] leading-[1.4] text-ink-2">{metaLine(role, variant)}</p>
      <p className="text-[14px] leading-[1.4] text-ink">{role.blurb}</p>
      <div className="flex flex-wrap gap-2">
        {role.skills.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </article>
  );
}

/** Saved roles: Remove, then the way on — the application on file, a disabled button saying why the role is closed to them, or Apply. */
function SavedActions({ role, application, closed, out, onRemove }: { role: Role; application: Application | undefined; closed: { label: string; hint?: string } | null; out: (href: string) => string; onRemove: () => void }) {
  return (
    <>
      <Button size="sm" variant="danger" onClick={onRemove}>
        Remove
      </Button>
      {/* A saved role that has already been applied to opens that application; it used to
          keep offering "Apply", which just landed on the role page. */}
      {application ? (
        <LinkButton size="sm" variant="primary" href={out(`/independent/jobs/applications/${application.id}`)}>
          View application
        </LinkButton>
      ) : closed ? (
        <Button size="sm" disabled title={closed.hint}>
          {closed.label}
        </Button>
      ) : (
        <LinkButton size="sm" variant="primary" href={out(`/independent/jobs/${role.slug}?apply=1`)}>
          Apply
        </LinkButton>
      )}
    </>
  );
}

/** Discover: the save toggle, and View role. */
function DiscoverActions({ slug, isSaved, onToggle }: { slug: string; isSaved: boolean; onToggle: () => void }) {
  const Mark = isSaved ? Bookmarked : Bookmark;
  return (
    <>
      <button
        type="button"
        aria-label={isSaved ? "Unsave role" : "Save role"}
        aria-pressed={isSaved}
        onClick={onToggle}
        className="flex size-7 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary"
      >
        <Mark size={16} aria-hidden />
      </button>
      <LinkButton size="sm" variant="primary" href={`/independent/jobs/${slug}`}>
        View role
      </LinkButton>
    </>
  );
}

/** The line under the title: the rate, the level and when it was posted — on Saved roles, when it was saved and when it closes. */
function metaLine(role: Role, variant: "discover" | "saved") {
  /** A part-time role says how much of the week it is, beside its rate. */
  const rate = role.type === "part-time" && role.hours ? `${role.rate} · ${hoursLabel(role.hours)}` : role.rate;
  return variant === "saved" ? `${rate} · ${role.level} · ${role.savedAgo} · ${role.closes}` : `${rate} · ${role.level} · ${role.posted}`;
}

/**
 * A saved role the talent can't apply to — withdrawn, turned down, filled, or another engagement on
 * file — as its disabled button says it, with the hint naming that engagement; null when it's open.
 */
function closedButton(role: Role, withdrawn: boolean, declined: boolean, engagedElsewhere: boolean, engagedOn: string | undefined) {
  if (!(withdrawn || declined || role.filled || engagedElsewhere)) return null;
  return {
    label: withdrawn ? "Withdrawn" : declined ? "Not selected" : role.filled ? "Position filled" : "Apply",
    hint: engagedElsewhere && !withdrawn && !declined && !role.filled ? `You're already engaged on ${engagedOn} — one engagement at a time` : undefined,
  };
}
