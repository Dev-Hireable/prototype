"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { ICONS } from "@/components/admin/icons";
import { ICON_BUTTON } from "@/components/portal/styles";
import { Button, Chip, LinkButton, MatchPill, Toast } from "@/components/independent/ui";
import { useWithReturn } from "@/components/portal/return";
import { TalentProfile, type TalentProfileData } from "@/components/portal/TalentProfile";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { contractTypeOf, evaluationsOf, useDeal, type Deal } from "@/lib/demo/deal";
import { useIntroVideo } from "@/lib/demo/intro";
import { PAIR } from "@/lib/demo/live";
import { traitTagsFor } from "@/lib/demo/work-style";
import { pastEvaluations, type PastEvaluation } from "@/lib/independent/data";
import { useToast } from "@/lib/portal/toast";
import { pipelineHref } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { useSavedTalent } from "@/lib/team/saved";
import { usePipeline } from "@/lib/team/pipeline";

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
 * height, and `content-center` centres it vertically while keeping it a block, so `truncate` and
 * `text-right` still work inside. `items-center` only affects cells that are themselves flex rows
 * (a stacked cell asks for `!items-start`). Rows are split by a light rule and columns by space
 * alone: a rule between every cell read as a spreadsheet. A cell that wants to fill edge to edge (a
 * coloured stat) opts out of the padding with `!p-0`.
 */
const CELLS = "[&>*]:self-stretch [&>*]:content-center [&>*]:items-center [&>*]:px-3 [&>*]:py-3";

/**
 * The narrowest a table can be before its columns crowd: its fixed widths (`w-[Npx]`), plus each
 * flexible column's floor (`min-w-[Npx]`, or 200px without one). Wider than that the flexible
 * columns take the room; narrower, the table scrolls sideways.
 */
function minWidthOf(cols: string[]) {
  return cols.reduce((sum, c) => sum + Number(c.match(/(?:^|\s)w-\[(\d+)px\]/)?.[1] ?? c.match(/min-w-\[(\d+)px\]/)?.[1] ?? 200), 0);
}

/** A table as a grid. `cols` are Tailwind width classes. */
export function Table({ cols, head, children }: { cols: string[]; head: string[]; children: ReactNode }) {
  return (
    // It sized itself to its longest text (min-w-max), so payments and offers scrolled sideways on
    // a laptop whatever room they had. It fills the page now, and only scrolls once the page is
    // narrower than its columns need — which still keeps a narrow pane from crushing them together.
    <div className="w-full overflow-x-auto rounded-lg bg-white outline -outline-offset-1 outline-border">
      <div style={{ minWidth: minWidthOf(cols) }}>
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

export function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex border-t border-[#e5e5e5] text-[13px] leading-[1.4] whitespace-nowrap text-ink hover:bg-surface-alt/60 ${CELLS} ${className}`}>{children}</div>;
}

/** Search + dropdowns on the left, a count or a button on the right. */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {children}
      <span className="flex-1" />
      {right}
    </div>
  );
}

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
        <IndependentCardActions person={person} variant={variant} onInvite={onInvite} onRemove={onRemove} />
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

/**
 * The card's actions: Remove on the saved list, or the save toggle on Discover — then Invite to
 * apply, or their column on the role's board once they're a candidate.
 */
function IndependentCardActions({ person, variant, onInvite, onRemove }: { person: Independent; variant: "discover" | "saved"; onInvite: () => void; onRemove?: () => void }) {
  const { pipelineOf } = usePipeline();
  const { saved, toggleSaved } = useSavedTalent();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <div className="flex shrink-0 items-center gap-2">
      {variant === "saved" ? (
        <Button size="sm" variant="danger" onClick={() => (onRemove ? onRemove() : toggleSaved(person.slug))}>
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
  );
}

/**
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

/** The heading on the settings/profile cards. */
export function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
      {children}
    </h2>
  );
}

/**
 * A drawer (800 wide, right-anchored) on shadcn's Sheet, so it slides in and out — it used to
 * mount and unmount in a single frame. A title row with the close, then a scrolling body. The Sheet
 * portals, traps focus and closes on Escape or a click outside.
 *
 * `header` swaps the visible title for other content in that row (the title stays the dialog's
 * accessible name), `actions` sit beside the close, and `footer` pins below the body — the task
 * panel uses all three. A `header` may run to several lines (an eyebrow such as "#4", a name that
 * wraps), so its row aligns to the top, with the actions and the close centred on its first 20px
 * line, and a hairline under it: the body scrolls beneath it.
 *
 * Opening moves the focus to the first control inside, unless one was already focused (autoFocus).
 * `initialFocus="close"` starts on the close button instead — for a header whose first control is a
 * field, which shouldn't look mid-edit every time the sheet opens. A ref starts on its control, or on
 * the close button when that control isn't there — the task sheet, opened to set dates, starts on the
 * first date this person can change.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 800,
  header,
  actions,
  footer,
  testId,
  initialFocus = "first",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  testId?: string;
  initialFocus?: "first" | "close" | RefObject<HTMLElement | null>;
}) {
  const Close = ICONS.close;
  const closeRef = useRef<HTMLButtonElement>(null);
  const start = initialFocus === "first" ? true : initialFocus === "close" ? closeRef : () => initialFocus.current ?? closeRef.current;
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" showCloseButton={false} initialFocus={start} className="gap-0 data-[side=right]:w-full" style={{ maxWidth: width }} data-testid={testId}>
        <SheetHeader className={`flex-row justify-between gap-3 px-6 py-5 ${header ? "items-start border-b border-border" : "items-center"}`}>
          {header ? (
            <>
              <SheetTitle className="sr-only">{title}</SheetTitle>
              <div className="flex min-w-0 flex-1 items-center gap-2">{header}</div>
            </>
          ) : (
            <SheetTitle className="font-sans text-[18px] leading-[1.4] font-semibold text-ink">{title}</SheetTitle>
          )}
          <div className={`flex shrink-0 items-center gap-1 ${header ? "h-5" : ""}`}>
            {actions}
            {/* The negative margin gives the icon a hover box without making the row taller. */}
            <SheetClose ref={closeRef} aria-label="Close" className={`${ICON_BUTTON} -m-1.5 size-8`}>
              <Close size={20} aria-hidden />
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

/**
 * An independent's profile preview, drawn as the same Contra-style profile as
 * the full page and the talent's own view, in a sheet that slides in: the hero (Invite / Save, the
 * facts, the intro) and the tabs are all here, with the full page one click away beside the photo.
 */
export function ProfileDrawer({ person, onClose, onInvite }: { person: Independent | null; onClose: () => void; onInvite: (p: Independent) => void }) {
  const withReturn = useWithReturn();
  /** The one on screen, kept while the sheet slides out so it doesn't empty mid-animation. */
  const [last, setLast] = useState(person);
  if (person && person.slug !== last?.slug) setLast(person);
  const p = person ?? last;
  const [toast, setToast] = useToast();
  const Out = ICONS.northEast;
  return (
    <>
      <Drawer open={!!person} onClose={onClose} title="Independent profile">
        {p && (
          <TeamProfile
            person={p}
            onInvite={() => onInvite(p)}
            onPlayIntro={() => setToast("Intro video plays here", "info")}
            inSheet
            // A plain ink link by the photo, not a button or the brand blue: it leaves the preview for the full page.
            // No underline on hover — the arrow nudges the way it points instead.
            photoAction={
              <Link
                href={withReturn(`/team/discover/${p.slug}`)}
                className="group inline-flex items-center gap-1 rounded-sm text-[14px] leading-[1.2] font-medium tracking-[0.2px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                View profile
                <Out
                  size={16}
                  aria-hidden
                  className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 motion-reduce:transition-none"
                />
              </Link>
            }
          />
        )}
      </Drawer>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/** The live pair's evaluations: the live engagement's first, then the ones from before it. */
function pairHistory(deal: Deal | null): PastEvaluation[] {
  return [
    ...(deal ? evaluationsOf(deal.contract).map((e) => ({ company: deal.company, role: deal.title, type: contractTypeOf(deal), date: e.date, stars: e.stars, feedback: e.feedback })) : []),
    ...pastEvaluations,
  ];
}

/** The Team Builder's record of a talent, as TalentProfile draws it — with the intro video and history only the live pair has. */
function profileData(person: Independent, introVideo: string | undefined, history: PastEvaluation[]): TalentProfileData {
  return {
    name: person.name,
    headline: person.role,
    photo: person.avatar,
    intro: person.intro,
    introVideo,
    rate: person.rate,
    level: person.level,
    location: person.location,
    bio: person.bio,
    skills: person.skills,
    tags: traitTagsFor(person.workStyle.independent, "independent"),
    links: person.links ?? { linkedin: "", portfolio: "", website: "" },
    history,
  };
}

/**
 * A talent's profile as a Team Builder reads it (IN-060): the talent's own TalentProfile, with the
 * match beside the name and Invite to apply / Save as the actions. Their work style is the Workplace
 * Tags under About. The Discover page draws it full width; the preview sheet keeps its tab to itself;
 * a role's candidate page puts its stage buttons in the hero and its pipeline in the aside.
 */
export function TeamProfile({
  person,
  onInvite,
  onPlayIntro,
  inSheet = false,
  actions,
  note,
  aside,
  photoAction,
}: {
  person: Independent;
  /** Discover's Invite to apply. */
  onInvite?: () => void;
  onPlayIntro: () => void;
  inSheet?: boolean;
  /** In place of Invite to apply / Save: the candidate page's next step for the candidate. */
  actions?: ReactNode;
  /** A line under the actions, e.g. what the candidate page is waiting on. */
  note?: ReactNode;
  /** A column under the intro, beside the tab's content (TalentProfile). */
  aside?: ReactNode;
  /** Beside the photo: the preview sheet's View profile link. */
  photoAction?: ReactNode;
}) {
  const deal = useDeal();
  const pair = person.slug === PAIR.independent.slug;
  /** The intro video the live pair added to their own profile, which plays here too. */
  const introVideo = useIntroVideo();
  /** The live pair's evaluations are the ones the talent's own profile lists; nobody else has any on Hireable yet. */
  const history = pair ? pairHistory(deal) : [];
  return (
    <TalentProfile
      viewer="team"
      person={profileData(person, pair ? (introVideo ?? undefined) : undefined, history)}
      // The same gradient match pill as the Discover cards, at the header's size.
      badge={<MatchPill pct={person.match} title={MATCH_TOOLTIP} size="lg" />}
      actions={actions ?? <TeamProfileActions person={person} onInvite={onInvite} />}
      note={note}
      onPlayIntro={onPlayIntro}
      aside={aside}
      photoAction={photoAction}
      tabInUrl={!inSheet}
    />
  );
}

/** Invite to apply — or their column on the role's board once they're a candidate — and Save. */
function TeamProfileActions({ person, onInvite }: { person: Independent; onInvite?: () => void }) {
  const { pipelineOf } = usePipeline();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
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
      <SaveButton person={person} />
    </>
  );
}

/** Save / Saved beside a profile's other actions. */
export function SaveButton({ person }: { person: Independent }) {
  const { saved, toggleSaved } = useSavedTalent();
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <Button onClick={() => toggleSaved(person.slug)}>
      <Mark size={18} aria-hidden className={isSaved ? "text-primary" : "text-ink-2"} />
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
