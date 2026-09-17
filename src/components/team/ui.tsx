"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { MdBookmark, MdOutlineBookmarkBorder, MdPlayCircleFilled, MdStar } from "react-icons/md";
import { ICONS } from "@/components/admin/icons";
import { Button, Chip, KeyValue, MatchPill, WorkStyleChart } from "@/components/independent/ui";
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

/** Figma "Table": #f2f2f2 header (13 medium), rows px 16 / py 12 with #c3c3c3 rules. `cols` are Tailwind width classes. */
export function Table({ cols, head, children }: { cols: string[]; head: string[]; children: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-lg bg-white outline -outline-offset-1 outline-border">
      <div className="flex items-center gap-4 bg-surface-2 px-4 py-3 text-[13px] leading-[1.4] font-medium whitespace-nowrap text-ink-2">
        {head.map((h, i) => (
          <span key={h} className={cols[i]}>
            {h}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-4 border-t border-border px-4 py-3 text-[13px] leading-[1.4] whitespace-nowrap text-ink">{children}</div>;
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
  const { saved, toggleSaved } = useDemo();
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
          <Button size="sm" variant="primary" onClick={onInvite}>
            Invite to apply
          </Button>
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

/** Figma "Drawer" (800 wide, right-anchored): 18px title row px-6 py-5 with a close icon, body p-6 gap-4, dim overlay behind. */
export function Drawer({ open, onClose, title, children, width = 800 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  const Close = ICONS.close;
  if (!open) return null;
  // Portalled for the same reason as Modal — see the note there.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside className="flex h-full flex-col bg-white" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[18px] leading-[1.4] font-semibold text-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-ink">
            <Close size={20} aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

/** Figma "Discover / Independent profile · preview drawer": profile card, match note, Save + Invite, rate, skills, View full profile. */
export function ProfileDrawer({ person, onClose, onInvite }: { person: Independent | null; onClose: () => void; onInvite: (p: Independent) => void }) {
  const { saved, toggleSaved } = useDemo();
  const p = person;
  const isSaved = !!p && saved.includes(p.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <Drawer open={!!p} onClose={onClose} title="Independent profile">
      {p && (
        <>
          <div className="flex min-h-[272px] flex-col gap-4 rounded-lg p-4 outline -outline-offset-1 outline-border">
            <div className="flex items-start justify-between">
              <span className="relative">
                <Avatar src={p.avatar} size={56} />
                <span aria-hidden className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-ok" />
              </span>
              <button type="button" aria-label={isSaved ? "Unsave" : "Save"} onClick={() => toggleSaved(p.slug)} className="flex size-9 items-center justify-center rounded-full border border-primary text-primary">
                <Mark size={20} aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
                {p.name}
              </h3>
              <p className="text-[16px] leading-[1.5] tracking-[0.2px] text-ink-2">{p.role}</p>
            </div>
            <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{p.bio} Available for a 30-day trial starting October.</p>
          </div>
          <p className="flex items-center gap-3 text-[13px] leading-[1.4] text-ink-2">
            <MatchPill pct={p.match} /> Work style: {Math.round((p.match * 6) / 100)} of 6 traits aligned. See the full profile for the trait grid.
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="flex-1" onClick={() => toggleSaved(p.slug)}>
              {isSaved ? "Saved" : "Save"}
            </Button>
            <Button size="lg" variant="primary" className="flex-1" onClick={() => onInvite(p)}>
              Invite to apply
            </Button>
          </div>
          <div className="flex flex-col gap-6 rounded-lg p-4 outline -outline-offset-1 outline-border">
            <h4 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]">Rate &amp; details</h4>
            <div className="flex gap-2">
              {(
                [
                  ["Rate", p.rate.replace(" /month", "/mo")],
                  ["Experience", p.level],
                  ["Location", p.location],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex min-w-0 flex-1 flex-col gap-3 rounded bg-surface-2 p-2 leading-[1.2] tracking-[0.2px]">
                  <span className="h-3 text-[10px] text-ink-2">{k}</span>
                  <span className="text-[14px] text-[#101828]">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-lg p-4 outline -outline-offset-1 outline-border">
            <h4 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {p.skills.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </div>
          <Link href={`/team/discover/${p.slug}`} className="flex h-11 items-center justify-center rounded-lg border border-border bg-white text-[14px] font-medium text-ink">
            View full profile
          </Link>
        </>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------ candidate / talent profile -- */

const H4 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]";
const JUAN_BIO = "I am a dedicated Marketing Specialist with a strong passion for creating impactful campaigns and driving brand awareness. My experience spans digital marketing, content creation, and multi-channel campaign management including email, social media, and paid advertising. I thrive on translating data insights into creative strategies that boost engagement and deliver measurable results. My goal is to leverage my skills in campaign execution and performance tracking to contribute to the growth and success of every client I work with.";
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

/** Figma candidate profile right column (512): profile card, Rate & details, Work style, Skills, History. */
export function ProfileColumn({ person: p }: { person: Independent }) {
  const { saved, toggleSaved } = useDemo();
  const isSaved = saved.includes(p.slug);
  const first = p.name.split(" ")[0];
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
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{p.slug === "juan-dela-cruz" ? JUAN_BIO : p.bio}</p>
      </div>
      <div className="flex flex-col gap-6 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
        <h3 className={H4}>Rate &amp; details</h3>
        <div className="flex gap-2">
          <KeyValue label="Rate" value={p.rate.replace(" /month", "/mo")} />
          <KeyValue label="Experience" value={p.level} />
          <KeyValue label="Location" value={p.location} />
        </div>
      </div>
      <WorkStyleChart builder={p.workStyle.builder} independent={p.workStyle.independent} match={p.match} />
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
        <div className="flex flex-col gap-3">
          {HISTORY.map((h, i) => (
            <div key={h.role} className={`flex flex-col gap-3 pb-4 ${i < HISTORY.length - 1 ? "border-b border-[#e5e5e5]" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{h.role}</p>
                <span className="flex items-center gap-4">
                  <span className="flex gap-[3px] text-warn">
                    {[0, 1, 2, 3, 4].map((k) => (
                      <MdStar key={k} size={12} aria-hidden />
                    ))}
                  </span>
                  <span className="text-[10px] leading-[1.2] tracking-[0.2px] text-[#757575]">{h.date}</span>
                </span>
              </div>
              <p className="text-[10px] leading-[1.2] tracking-[0.2px] text-ink-2 italic">{h.quote.replace(/\{first\}/g, first)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
