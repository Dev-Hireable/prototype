"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MdBookmark, MdOutlineBookmarkBorder, MdPlayCircleFilled, MdStar } from "react-icons/md";
import { ICONS } from "@/components/admin/icons";
import { Button, Chip, KeyValue, LinkButton, MatchPill, Toast, useToast } from "@/components/independent/ui";
import { useWithReturn } from "@/components/portal/return";
import { TalentProfile } from "@/components/portal/TalentProfile";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { evaluationsOf, isFullTime, useDeal } from "@/lib/demo/deal";
import { useIntroVideo } from "@/lib/demo/intro";
import { PAIR } from "@/lib/demo/live";
import { traitTagsFor } from "@/lib/demo/work-style";
import { pastEvaluations, type PastEvaluation } from "@/lib/independent/data";
import { pipelineHref } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Figma "Avatars": round photo, grey #d2d8db ground. */
export function Avatar({ src, size = 40, className = "" }: { src: string; size?: number; className?: string }) {
  return <Image src={src} alt="" width={size * 2} height={size * 2} className={`shrink-0 rounded-full bg-[#d2d8db] object-cover object-top ${className}`} style={{ width: size, height: size }} />;
}

/** Table cell "Independent": 40px avatar + name (14 medium primary) + role (13 #616161). */
export function Person({ name, role, avatar, href }: { name: string; role: string; avatar: string; href?: string }) {
  const title = <p className="truncate text-[14px] leading-[1.4] font-medium text-primary">{name}</p>;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar src={avatar} />
      <span className="flex min-w-0 flex-1 flex-col whitespace-nowrap">
        {href ? <Link href={href} className="hover:underline">{title}</Link> : title}
        <p className="truncate text-[13px] leading-[1.4] text-ink-2">{role}</p>
      </span>
    </span>
  );
}

/**
 * Grid cells: every direct child of a header or row is a cell. Each one stretches to the full row
 * height so the column rules run top to bottom, and `content-center` centres it vertically while
 * keeping it a block, so `truncate` and `text-right` still work inside. `items-center` only
 * affects cells that are themselves flex rows. A cell that wants to fill edge to edge (a coloured
 * stat) opts out of the padding with `!p-0`.
 */
const CELLS = "[&>*]:self-stretch [&>*]:content-center [&>*]:items-center [&>*]:px-3 [&>*]:py-3 [&>*+*]:border-l [&>*+*]:border-[#e5e5e5]";

/** Figma "Table", as a grid: #f2f2f2 header (13 medium), light #e5e5e5 row and column rules. `cols` are Tailwind width classes. */
export function Table({ cols, head, children }: { cols: string[]; head: string[]; children: ReactNode }) {
  return (
    // overflow-x-auto + min-w-max: the columns are fixed widths, so a narrow pane used to crush
    // the flexible first column into its neighbour. Now the table keeps its natural width and
    // scrolls sideways instead.
    <div className="w-full overflow-x-auto rounded-lg bg-white outline -outline-offset-1 outline-border">
      <div className="min-w-max">
        <div className={`flex bg-surface-2 text-[13px] leading-[1.4] font-medium whitespace-nowrap text-ink-2 ${CELLS}`}>
          {head.map((h, i) => (
            <span key={h} className={cols[i]}>
              {h}
            </span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className={`flex border-t border-[#e5e5e5] text-[13px] leading-[1.4] whitespace-nowrap text-ink hover:bg-surface-alt/60 ${CELLS}`}>{children}</div>;
}

/** Figma "Toolbar": search + dropdowns on the left, a count (14 #616161) or a button on the right. */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {children}
      <span className="flex-1" />
      {right}
    </div>
  );
}

/** Figma "Independent card" (Discover / Saved): p 20, gap 12, 48px avatar, name 14 medium primary, title 18 semibold + match pill. */
/**
 * TB-012 — what the match score is based on. Before a job post exists it is Work Style only
 * (Phase 1); a live job post adds Profile fit (Phase 2), the trial adds Performance (Phase 3),
 * and the post-trial evaluation finalises it (Phase 4).
 */
export const MATCH_TOOLTIP = "Work Style fit against your quiz answers, plus profile fit once you have a live job post. Trial performance and your evaluation fold in later.";

export function IndependentCard({
  person,
  variant = "discover",
  onInvite,
  onOpen,
  onRemove,
}: {
  person: Independent;
  variant?: "discover" | "saved";
  onInvite: () => void;
  onOpen?: (p: Independent) => void;
  /** Saved list only — TB-022 routes this through a confirmation prompt. */
  onRemove?: () => void;
}) {
  const { saved, toggleSaved, pipelineOf } = useDemo();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <article className="flex flex-col gap-3 rounded-lg bg-white p-5 outline -outline-offset-1 outline-border">
      <div className="flex items-center gap-3">
        <Avatar src={person.avatar} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {onOpen ? (
            <button type="button" onClick={() => onOpen(person)} className="self-start text-[14px] leading-[1.4] font-medium text-primary hover:underline">
              {person.name}
            </button>
          ) : (
            <Link href={`/team/discover/${person.slug}`} className="text-[14px] leading-[1.4] font-medium text-primary hover:underline">
              {person.name}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[18px] leading-[1.4] font-semibold text-ink">{person.role}</span>
            <MatchPill pct={person.match} coded title={MATCH_TOOLTIP} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {variant === "saved" ? (
            <Button size="sm" onClick={() => (onRemove ? onRemove() : toggleSaved(person.slug))}>
              Remove
            </Button>
          ) : (
            <button
              type="button"
              aria-label={isSaved ? "Unsave independent" : "Save independent"}
              aria-pressed={isSaved}
              onClick={() => toggleSaved(person.slug)}
              className="flex size-7 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary"
            >
              <Mark size={16} aria-hidden />
            </button>
          )}
          {/* Already a candidate: open their column on the role's board rather than a dead button. */}
          {inPipeline ? (
            <LinkButton size="sm" href={withReturn(pipelineHref(inPipeline))}>
              View in pipeline
            </LinkButton>
          ) : (
            <Button size="sm" variant="primary" onClick={onInvite}>
              Invite to apply
            </Button>
          )}
        </div>
      </div>
      <p className="text-[14px] leading-[1.4] text-ink-2">
        {person.rate} · {person.level} · {person.location}
      </p>
      <div className="flex flex-wrap gap-2">
        {person.skills.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </article>
  );
}

/** Figma "Pagination": Previous / 1 2 3 … n / Next (14px, active page primary). */
/**
 * Figma "Pagination": Previous / 1 2 3 … n / Next (14px, active page primary).
 * TB-012 — the page numbers come from the real result count and Previous/Next actually move.
 */
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const Prev = ICONS.chevronLeft;
  const Next = ICONS.chevronRight;
  if (pages <= 1) return null;

  // Up to 3 numbers around the current page, with an ellipsis before the last when they don't meet.
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  const window = [start, start + 1, start + 2].filter((p) => p >= 1 && p <= pages);
  const items: (number | "…")[] = window.includes(pages) ? window : [...window, ...(window.at(-1)! < pages - 1 ? (["…"] as const) : []), pages];

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 text-[14px] leading-[1.4] font-medium text-ink">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className="flex items-center gap-1 font-normal text-ink-2 disabled:text-[#c3c3c3]">
        <Prev size={18} aria-hidden /> Previous
      </button>
      {items.map((p, i) =>
        p === "…" ? (
          <span key={`gap${i}`} className="px-1 text-ink-2">
            …
          </span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} className={`rounded-md px-2.5 py-1.5 ${p === page ? "bg-primary text-white" : "hover:bg-surface-alt"}`}>
            {p}
          </button>
        ),
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pages} className="flex items-center gap-1 font-normal text-ink-2 disabled:text-[#c3c3c3]">
        Next <Next size={18} aria-hidden />
      </button>
    </nav>
  );
}

/** Figma "Frame" title used on the settings/profile cards: DM Sans 18. */
export function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
      {children}
    </h2>
  );
}

/**
 * Figma "Drawer" (800 wide, right-anchored) on shadcn's Sheet, so it slides in and out — it used to
 * mount and unmount in a single frame. An 18px title row (px 24 / py 20) with an optional action
 * beside the close, then a scrolling body (p 24, gap 16). The Sheet portals, traps focus and closes
 * on Escape or a click outside.
 */
export function Drawer({ open, onClose, title, action, children, width = 800 }: { open: boolean; onClose: () => void; title: string; action?: ReactNode; children: ReactNode; width?: number }) {
  const Close = ICONS.close;
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" showCloseButton={false} className="gap-0 data-[side=right]:w-full" style={{ maxWidth: width }}>
        <SheetHeader className="flex-row items-center justify-between gap-3 px-6 py-5">
          <SheetTitle className="font-sans text-[18px] leading-[1.4] font-semibold text-ink">{title}</SheetTitle>
          <div className="flex items-center gap-4">
            {action}
            <SheetClose aria-label="Close" className="text-ink">
              <Close size={20} aria-hidden />
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Figma "Discover / Independent profile · preview drawer", drawn as the same Contra-style profile as
 * the full page and the talent's own view, in a sheet that slides in: the hero (Invite / Save, the
 * facts, the intro) and the tabs are all here, with the full page one click away in the header.
 */
export function ProfileDrawer({ person, onClose, onInvite }: { person: Independent | null; onClose: () => void; onInvite: (p: Independent) => void }) {
  const withReturn = useWithReturn();
  /** The one on screen, kept while the sheet slides out so it doesn't empty mid-animation. */
  const [last, setLast] = useState(person);
  if (person && person.slug !== last?.slug) setLast(person);
  const p = person ?? last;
  const [toast, setToast] = useToast();
  return (
    <>
      <Drawer
        open={!!person}
        onClose={onClose}
        title="Independent profile"
        action={
          p && (
            <LinkButton size="sm" href={withReturn(`/team/discover/${p.slug}`)}>
              View full profile
            </LinkButton>
          )
        }
      >
        {p && <TeamProfile person={p} onInvite={() => onInvite(p)} onPlayIntro={() => setToast("Intro video plays here")} inSheet />}
      </Drawer>
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

/**
 * A talent's profile as a Team Builder reads it (IN-060): the talent's own TalentProfile, with the
 * match beside the name and Invite to apply / Save as the actions. Their work style is the Workplace
 * Tags under About. The Discover page draws it full width; the preview sheet keeps its tab to itself.
 */
export function TeamProfile({ person, onInvite, onPlayIntro, inSheet = false }: { person: Independent; onInvite: () => void; onPlayIntro: () => void; inSheet?: boolean }) {
  const deal = useDeal();
  const pair = person.slug === PAIR.independent.slug;
  /** The intro video the live pair added to their own profile, which plays here too. */
  const introVideo = useIntroVideo();
  /** The live pair's evaluations are the ones the talent's own profile lists; nobody else has any on Hireable yet. */
  const history: PastEvaluation[] =
    pair
      ? [
          ...(deal ? evaluationsOf(deal.contract).map((e) => ({ company: deal.company, role: deal.title, type: isFullTime(deal) ? ("full-time" as const) : ("trial" as const), date: e.date, stars: e.stars, feedback: e.feedback })) : []),
          ...pastEvaluations,
        ]
      : [];
  return (
    <TalentProfile
      viewer="team"
      person={{
        name: person.name,
        headline: person.role,
        photo: person.avatar,
        intro: person.intro,
        introVideo: pair ? (introVideo ?? undefined) : undefined,
        rate: person.rate,
        level: person.level,
        location: person.location,
        bio: person.bio,
        skills: person.skills,
        tags: traitTagsFor(person.workStyle.independent, "independent"),
        links: person.links ?? { linkedin: "", portfolio: "", website: "" },
        history,
      }}
      // The same gradient match pill as the Discover cards, at the header's size.
      badge={<MatchPill pct={person.match} title={MATCH_TOOLTIP} size="lg" />}
      actions={<TeamProfileActions person={person} onInvite={onInvite} />}
      onPlayIntro={onPlayIntro}
      tabInUrl={!inSheet}
    />
  );
}

/** Invite to apply — or their column on the role's board once they're a candidate — and Save. */
function TeamProfileActions({ person, onInvite }: { person: Independent; onInvite: () => void }) {
  const { saved, toggleSaved, pipelineOf } = useDemo();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <>
      {inPipeline ? (
        <LinkButton variant="primary" href={withReturn(pipelineHref(inPipeline))}>
          View in pipeline
        </LinkButton>
      ) : (
        <Button variant="primary" onClick={onInvite}>
          Invite to apply
        </Button>
      )}
      <Button onClick={() => toggleSaved(person.slug)}>
        <Mark size={18} aria-hidden className={isSaved ? "text-primary" : "text-ink-2"} />
        {isSaved ? "Saved" : "Save"}
      </Button>
    </>
  );
}

/* ------------------------------------------------ candidate / talent profile -- */

const H4 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]";
/** Sample work history for the seeded independents; the live pair shows the evaluations they actually received. */
const HISTORY = [
  { role: "Content Marketing Manager", date: "January 1, 2020", quote: "“{first} exceeded expectations on every campaign. His ability to analyze data and pivot strategy mid-flight saved us thousands in ad spend.”" },
  { role: "Growth Marketing Lead", date: "January 1, 2020", quote: "“Incredible attention to detail and a natural sense for what resonates with audiences. Our email open rates doubled under {first}’s watch.”" },
  { role: "Senior Marketing Specialist", date: "January 1, 2020", quote: "“Solid performer with strong fundamentals. Sometimes needed guidance on prioritization, but always delivered quality work on time.”" },
];

/** Figma "IntroCardThumbnail": 384×480 video still with the play button top-right. */
export function IntroCard({ person, onPlay }: { person: Independent; onPlay: () => void }) {
  return (
    <div className="relative h-[480px] w-[384px] overflow-hidden rounded-lg border border-border">
      <Image src={person.intro ?? person.avatar} alt="" width={768} height={960} className="size-full object-cover object-top" />
      <button type="button" aria-label="Play intro" onClick={onPlay} className="absolute top-[15px] right-[17px] text-white">
        <MdPlayCircleFilled size={28} aria-hidden />
      </button>
    </div>
  );
}

/** Figma candidate profile right column (512): profile card, Rate & details, Skills, History. Work style is the tags, not a chart. */
export function ProfileColumn({ person: p }: { person: Independent }) {
  const { saved, toggleSaved } = useDemo();
  const isSaved = saved.includes(p.slug);
  const first = p.name.split(" ")[0];
  const deal = useDeal();
  /**
   * The talent's profile promises "exactly how your profile appears to Team Builders", and lists
   * only the evaluations they have received. This column showed Juan, a sales lead, three marketing
   * reviews dated 1 January 2020 that his own profile never had.
   */
  const history =
    p.slug === PAIR.independent.slug
      ? evaluationsOf(deal?.contract).map((e) => ({ role: deal?.title ?? "", date: e.date, stars: e.stars, quote: `“${e.feedback}”` }))
      : HISTORY.map((h) => ({ ...h, stars: 5, quote: h.quote.replace(/\{first\}/g, first) }));
  return (
    <div className="flex w-[512px] shrink-0 flex-col gap-4">
      <div className="flex min-h-[440px] flex-col gap-4 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
        <div className="flex items-start justify-between">
          <span className="relative">
            <Avatar src={p.avatar} size={56} />
            <span aria-hidden className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-ok" />
          </span>
          <button type="button" aria-label={isSaved ? "Unsave" : "Save"} onClick={() => toggleSaved(p.slug)} className="flex size-9 items-center justify-center rounded-full border border-primary text-primary">
            {isSaved ? <MdBookmark size={20} aria-hidden /> : <MdOutlineBookmarkBorder size={20} aria-hidden />}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {p.name}
          </h2>
          <p className="text-[16px] leading-[1.5] tracking-[0.2px] text-ink-2">{p.role}</p>
        </div>
        {/* The talent's own bio (byName follows their profile) — it was swapped for a marketing one here. */}
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{p.bio}</p>
      </div>
      <div className="flex flex-col gap-6 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
        <h3 className={H4}>Rate &amp; details</h3>
        <div className="flex gap-2">
          <KeyValue label="Rate" value={p.rate.replace(" /month", "/mo")} />
          <KeyValue label="Experience" value={p.level} />
          <KeyValue label="Location" value={p.location} />
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
        <h3 className={H4}>Skills</h3>
        <div className="flex flex-wrap gap-2">
          {p.skills.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
        <h3 className={H4}>History</h3>
        {history.length === 0 && <p className="text-[13px] leading-[1.4] text-ink-2">No evaluations on Hireable yet. They appear here once a Team Builder sends one.</p>}
        <div className="flex flex-col gap-3">
          {history.map((h, i) => (
            <div key={`${h.role}-${h.date}-${i}`} className={`flex flex-col gap-3 pb-4 ${i < history.length - 1 ? "border-b border-[#e5e5e5]" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{h.role}</p>
                <span className="flex items-center gap-4">
                  <span className="flex gap-[3px] text-warn">
                    {[0, 1, 2, 3, 4].map((k) => (
                      <MdStar key={k} size={12} aria-hidden className={k < h.stars ? "" : "text-[#d8d8d8]"} />
                    ))}
                  </span>
                  <span className="text-[10px] leading-[1.2] tracking-[0.2px] text-[#757575]">{h.date}</span>
                </span>
              </div>
              <p className="text-[10px] leading-[1.2] tracking-[0.2px] text-ink-2 italic">{h.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
