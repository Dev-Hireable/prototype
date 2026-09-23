"use client";

import Link from "next/link";
import { ICONS } from "@/components/admin/icons";
import { Button, Chip, Initials, JobBadge, LinkButton, MatchPill } from "./ui";
import { MATCH_TOOLTIP, matchFor } from "@/lib/independent/data";
import type { Role } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { useWithReturn } from "@/components/portal/return";

const Bookmark = ICONS.saved;
const Bookmarked = ICONS.bookmark;

/** Figma "Role card": p 20, gap 12, 1px #c3c3c3 — Discover (Save + View role) and Saved roles (Remove + Apply) variants. */
export function RoleCard({ role, variant = "discover" }: { role: Role; variant?: "discover" | "saved" }) {
  const { saved, toggleSaved, workStyle, applications, withdrawnRoleSlugs } = useDemo();
  const isSaved = saved.includes(role.slug);
  const application = applications.find((a) => a.roleSlug === role.slug);
  const withdrawn = withdrawnRoleSlugs.includes(role.slug);
  const withReturn = useWithReturn();
  /** From Saved roles the next page leads back there; from Discover the role page's own link already does. */
  const out = (href: string) => (variant === "saved" ? withReturn(href) : href);
  const meta =
    variant === "saved"
      ? `${role.rate} · ${role.level} · ${role.savedAgo} · ${role.closes}`
      : `${role.rate} · ${role.level} · ${role.posted}`;
  const Mark = isSaved ? Bookmarked : Bookmark;

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
            <MatchPill pct={matchFor(role, workStyle)} coded title={MATCH_TOOLTIP} />
          </div>
          <p className="text-[14px] leading-[1.4] text-ink-2">
            {role.company} · {role.location}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {variant === "saved" ? (
            <>
              <Button size="sm" onClick={() => toggleSaved(role.slug)}>
                Remove
              </Button>
              {/* A saved role that has already been applied to opens that application; it used to
                  keep offering "Apply", which just landed on the role page. */}
              {application ? (
                <LinkButton size="sm" variant="primary" href={out(`/independent/jobs/applications/${application.id}`)}>
                  View application
                </LinkButton>
              ) : withdrawn || role.filled ? (
                <Button size="sm" disabled>
                  {withdrawn ? "Withdrawn" : "Position filled"}
                </Button>
              ) : (
                <LinkButton size="sm" variant="primary" href={out(`/independent/jobs/${role.slug}?apply=1`)}>
                  Apply
                </LinkButton>
              )}
            </>
          ) : (
            <>
              {/* Figma "Save": 28px circle, 1.167px primary stroke */}
              <button
                type="button"
                aria-label={isSaved ? "Unsave role" : "Save role"}
                aria-pressed={isSaved}
                onClick={() => toggleSaved(role.slug)}
                className="flex size-7 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary"
              >
                <Mark size={16} aria-hidden />
              </button>
              <LinkButton size="sm" variant="primary" href={`/independent/jobs/${role.slug}`}>
                View role
              </LinkButton>
            </>
          )}
        </div>
      </div>
      <p className="text-[14px] leading-[1.4] text-ink-2">{meta}</p>
      <p className="text-[14px] leading-[1.4] text-ink">{role.blurb}</p>
      <div className="flex flex-wrap gap-2">
        {role.skills.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </article>
  );
}
