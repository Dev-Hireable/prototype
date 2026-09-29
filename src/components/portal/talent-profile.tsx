"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Chip, EmptyState, JobBadge, Modal, Tabs } from "@/components/portal/ui";
import { FactStrip, Section } from "@/components/portal/page-parts";
import { Tip } from "@/components/portal/tip";
import { TraitTag } from "@/components/portal/trait-tag";
import type { WorkStyleTag } from "@/lib/demo/work-style";
import type { PastEvaluation } from "@/lib/demo/deal";
import { keyed } from "@/lib/portal/keys";
import { useQueryState } from "@/lib/portal/query-state";

const Star = ICONS.star;
const Pin = ICONS.location;
const Play = ICONS.play;
const Out = ICONS.northEast;
const Work = ICONS.work;
const Close = ICONS.close;

/** A talent profile as both sides read it: the independent's own view and every Team Builder view (IN-060). */
export type TalentProfileData = {
  name: string;
  headline: string;
  photo: string;
  /** The intro-video still. */
  intro?: string;
  /** The intro video the talent added themselves (@/lib/demo/intro), which plays for real. */
  introVideo?: string;
  /** The monthly rate as each side keeps it: "1,600" on the talent's, "$1,600 /month" on the Team Builder's. */
  rate: string;
  level: string;
  location: string;
  bio: string;
  skills: string[];
  tags: WorkStyleTag[];
  links: { website: string; linkedin: string; portfolio: string };
  /** IN-066 — every evaluation received, the live engagement first. */
  history: PastEvaluation[];
};

type Viewer = "self" | "team";
type Tab = "about" | "history" | "portfolio";
/** The talent's own pencils, each right beside what it edits. */
type Pencils = Partial<Record<"profile" | "bio" | "tags" | "skills" | "portfolio", ReactNode>>;
/** The editors that open in place of the part they edit. */
type Editors = Partial<Record<"profile" | "bio" | "skills" | "portfolio", ReactNode>>;
/** Work style is the Workplace Tags under About — there's no tab of its own. */
const TABS: { value: Tab; label: string }[] = [
  { value: "about", label: "About" },
  { value: "history", label: "History" },
  { value: "portfolio", label: "Portfolio" },
];
const TAB_KEYS = TABS.map((t) => t.value);

/** Body copy; sections keep it to a 768px column (PageParts' Section), so it stays readable. */
const BODY = "text-[14px] leading-[1.2] tracking-[0.2px] text-ink";
const QUIET = "text-[14px] leading-[1.4] text-ink-2";
const DM = { fontVariationSettings: '"opsz" 14' };

/** The link icons, drawn at their own size. */
const WEBSITE = <Image src="/independent/website.svg" alt="" width={20} height={20} />;
const LINKEDIN = <Image src="/independent/linkedin.svg" alt="" width={14} height={14} />;

/** Links are saved as typed, with or without a scheme ("linkedin.com/in/…" or "https://…"). */
const hrefOf = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const bare = (v: string) => v.replace(/^https?:\/\//i, "").replace(/\/$/, "");
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** What a page puts around the profile: who's reading, and each side's own additions. */
type TalentProfileProps = {
  person: TalentProfileData;
  /** Who is reading: the talent themselves, or a Team Builder. Sets the empty-state copy and what a tag's tooltip says. */
  viewer: Viewer;
  /** Beside the name — "Pro" on the talent's own view, the match on a Team Builder's. */
  badge?: ReactNode;
  /** A Team Builder's Invite to apply / Save, under the facts. */
  actions?: ReactNode;
  /** A line under the facts and actions. */
  note?: ReactNode;
  /** The still has no video behind it, so the page says what playing it does; a video the talent added plays here. */
  onPlayIntro: () => void;
  /** The talent's own pencils (@/components/portal/InlineEdit), each right beside what it edits: `profile` by the name, the rest by their section titles. */
  edit?: Pencils;
  /** An EditPanel open in place of the whole part it edits (@/components/independent/ProfileEditors). */
  editor?: Editors;
  /** The talent's own Add / Change intro, over the card's corner. */
  introAction?: ReactNode;
  /** A column beside the tab's content, under the intro: the candidate page's interview, notes and pipeline tracker. */
  aside?: ReactNode;
  /** Right beside the photo, level with its bottom edge: the preview sheet's View profile link. */
  photoAction?: ReactNode;
  /** A page keeps the tab in its URL; a sheet over another page keeps it to itself. */
  tabInUrl?: boolean;
};

/**
 * The talent profile, laid out like a Contra profile. The hero holds who they are (photo, name,
 * headline, then where they are with their website and LinkedIn), the facts a Team Builder weighs
 * at a glance (rate, experience, rating) and what you can do about it, with About / History /
 * Portfolio under them. The intro video runs down the right beside all of it to the divider along
 * the tab row. On the talent's own view each part is edited in place: the pencil beside it opens an
 * editor where the part was (`editor`).
 */
export function TalentProfile({ person: p, viewer, badge, actions, note, onPlayIntro, edit = {}, editor = {}, introAction, aside, photoAction, tabInUrl = true }: TalentProfileProps) {
  const [tab, setTab] = useProfileTab(tabInUrl);
  const [playing, setPlaying] = useState(false);
  const self = viewer === "self";
  const first = p.name.split(" ")[0];
  const hasIntro = !!(p.intro || p.introVideo);

  return (
    <div className="@container flex flex-col gap-6">
      {/* One frame for the hero and the tabs, closed by the divider along the tab row: who they are on
          the left with the tabs under them, the intro on the right running down beside them. Narrower, the intro is a 4:5
          card beside the header and the tabs take the full width; narrowest, it drops under the header. */}
      <div
        className={`grid gap-y-10 shadow-[inset_0_-1px_0_#c3c3c3] ${
          // Beside the header alone the card stays small, so the facts strip keeps its room; running down beside the tabs it
          // grows to 320, near the 4:5 of the header's height.
          hasIntro ? "@lg:grid-cols-[minmax(0,1fr)_clamp(160px,30%,240px)] @lg:gap-x-8 @2xl:grid-cols-[minmax(0,1fr)_clamp(200px,34%,320px)] @2xl:gap-x-10" : ""
        }`}
      >
        <header className="flex min-w-0 flex-col gap-6">
          {editor.profile || <Hero person={p} badge={badge} edit={edit.profile} photoAction={photoAction} actions={actions} note={note} />}
        </header>

        {hasIntro && <IntroCell still={p.intro} video={p.introVideo} name={first} action={introAction} onPlay={() => (p.introVideo ? setPlaying(true) : onPlayIntro())} />}

        {/* The active tab's underline sits on the divider. */}
        <div className={`min-w-0 ${hasIntro ? "@lg:col-span-2 @2xl:col-span-1 @2xl:col-start-1" : ""}`}>
          <Tabs value={tab} onChange={setTab} options={TABS} />
        </div>
      </div>

      <TabContent tab={tab} person={p} self={self} first={first} edit={edit} editor={editor} aside={aside} />

      {/* The video the talent added, played for real (the still only stands in for one). */}
      {p.introVideo && <IntroPlayer src={p.introVideo} name={first} open={playing} onClose={() => setPlaying(false)} />}
    </div>
  );
}

/** The intro card's place in the hero, with the talent's own Add / Change intro over its corner. */
function IntroCell({ still, video, name, action, onPlay }: { still?: string; video?: string; name: string; action?: ReactNode; onPlay: () => void }) {
  return (
    // Running down beside the tabs, it stops where the tab row starts (mb 36, the row's height), so there's room
    // between the card and the divider instead of the card sitting on it.
    <div className="relative aspect-[4/5] w-full max-w-[280px] @lg:col-start-2 @lg:row-start-1 @lg:max-w-none @lg:self-center @2xl:row-[1/span_2] @2xl:mb-9 @2xl:aspect-auto @2xl:self-stretch">
      <IntroVideo still={still} video={video} name={name} onPlay={onPlay} />
      {/* Beside the card's play button, not inside it: a button can't hold another. */}
      {action && <div className="absolute top-3 right-3">{action}</div>}
    </div>
  );
}

/** The intro video the talent added, playing in a dialog of its own with a close button over it. */
function IntroPlayer({ src, name, open, onClose }: { src: string; name: string; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={`${name}'s intro video`} bare width={720}>
      <div className="relative bg-black">
        {/* react-doctor-disable-next-line react-doctor/no-autoplay-without-muted -- it opens on the viewer's own click on play: sound is what they asked for */}
        <video src={src} controls autoPlay playsInline className="block max-h-[calc(80vh/var(--ui-scale))] w-full" />
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <Close size={18} aria-hidden />
        </button>
      </div>
    </Modal>
  );
}

/** The badge beside the name — the talent's "Pro". A Team Builder's view has the gradient MatchPill there. */
export function FlatBadge({ tone = "ok", children }: { tone?: "ok" | "warn" | "neutral"; children: ReactNode }) {
  const TONE = { ok: "bg-[#eef9f2] text-ok", warn: "bg-warn-bg text-[#8e6f12]", neutral: "bg-surface-2 text-ink-2" };
  return <span className={`inline-flex h-8 items-center rounded px-3 text-[14px] leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

/** The open tab: kept in the URL on a page, or to itself on a sheet over another page. */
function useProfileTab(inUrl: boolean): [Tab, (tab: Tab) => void] {
  const [urlTab, setUrlTab] = useQueryState<Tab>("tab", "about", TAB_KEYS);
  const [ownTab, setOwnTab] = useState<Tab>("about");
  return inUrl ? [urlTab, setUrlTab] : [ownTab, setOwnTab];
}

/**
 * The hero's who-they-are block: the photo, the name with its badge, the headline and where they
 * are, then the facts strip and a Team Builder's actions and note under it.
 */
function Hero({
  person: p,
  badge,
  edit,
  photoAction,
  actions,
  note,
}: {
  person: TalentProfileData;
  badge?: ReactNode;
  /** The talent's pencil for this block, beside the badge. */
  edit?: ReactNode;
  photoAction?: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
}) {
  return (
    // Kept to the facts strip's width: the header reads as one block beside the intro.
    <div className="flex max-w-[480px] flex-col gap-6">
      {/* The photo, the name with its badge — and the talent's edit pencil — then the headline, then
          where they are with their links. */}
      <div className="flex flex-col gap-3">
        {/* The link sits level with the photo's bottom edge rather than halfway up it. */}
        <div className="flex items-end gap-4">
          <Image src={p.photo} alt="" width={160} height={160} className="size-20 rounded-full bg-[#d2d8db] object-cover" />
          {photoAction}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="font-display text-[32px] leading-[1.5] font-semibold break-words text-ink" style={DM}>
              {p.name}
            </h2>
            {(badge || edit) && (
              <span className="flex items-center gap-2">
                {badge}
                {edit}
              </span>
            )}
          </div>
          {p.headline && <p className="text-[16px] leading-[1.5] tracking-[0.2px] text-ink-2">{p.headline}</p>}
        </div>
        {(p.location || p.links.website || p.links.linkedin) && <PlaceAndLinks location={p.location} links={p.links} />}
      </div>
      <Facts rate={p.rate} level={p.level} history={p.history} />
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {note}
    </div>
  );
}

/** The row under the name: where they are, with their website and LinkedIn beside it. */
function PlaceAndLinks({ location, links }: { location: string; links: TalentProfileData["links"] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {location && (
        <span className="flex items-center gap-2 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
          <Pin size={20} aria-hidden className="shrink-0 text-ink-2" />
          {location}
        </span>
      )}
      {links.website && <IconLink label="Website" value={links.website} icon={WEBSITE} />}
      {links.linkedin && <IconLink label="LinkedIn" value={links.linkedin} icon={LINKEDIN} />}
    </div>
  );
}

/** Under the tab row: the open tab, with the page's aside beside it when there is one. */
function TabContent({
  tab,
  person: p,
  self,
  first,
  edit,
  editor,
  aside,
}: {
  tab: Tab;
  person: TalentProfileData;
  self: boolean;
  first: string;
  edit: Pencils;
  editor: Editors;
  aside?: ReactNode;
}) {
  return (
    // With an aside, the content and the aside share the hero's columns, so the aside lines up under the intro.
    <div className={aside ? "grid items-start gap-10 @2xl:grid-cols-[minmax(0,1fr)_clamp(200px,34%,320px)]" : "flex flex-col"}>
      <div className="flex min-w-0 flex-col gap-10">
        {tab === "about" && <AboutTab person={p} self={self} first={first} edit={edit} editor={editor} />}
        {/* IN-066 — company, role, contract type, date, rating and the written feedback; read-only. */}
        {tab === "history" && <HistoryTab history={p.history} self={self} first={first} />}
        {tab === "portfolio" && <PortfolioTab links={p.links} edit={edit.portfolio} editor={editor.portfolio} />}
      </div>
      {aside && <aside className="flex min-w-0 flex-col gap-4">{aside}</aside>}
    </div>
  );
}

/** About: the bio, the Workplace Tags and the skills, each saying what goes there while it's empty. */
function AboutTab({ person: p, self, first, edit, editor }: { person: TalentProfileData; self: boolean; first: string; edit: Pencils; editor: Editors }) {
  return (
    <div className="flex flex-col gap-10">
      <Section title="Bio" edit={edit.bio} editor={editor.bio}>
        {p.bio ? <p className={BODY}>{p.bio}</p> : <p className={QUIET}>{self ? "No bio yet. Team Builders read it first, so a few lines on what you do go a long way." : `${first} hasn't written a bio yet.`}</p>}
      </Section>
      {/* IN-063 — derived from the quiz answers and display-only. */}
      <Section title="Workplace Tags" edit={edit.tags}>
        {p.tags.length ? (
          <div className="flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <TraitTag key={`${t.trait}-${t.label}`} tag={t} view={self ? "self" : "other"} />
            ))}
          </div>
        ) : (
          <p className={QUIET}>{self ? "No tags yet. Take the work-style quiz and the tags it gives you appear here." : `No tags yet. They appear once ${first} takes the work-style quiz.`}</p>
        )}
      </Section>
      <Section title="Skills" edit={edit.skills} editor={editor.skills}>
        {p.skills.length ? (
          <div className="flex flex-wrap gap-2">
            {p.skills.map((s) => (
              <Chip key={s}>{s.replace(/^\w/, (c) => c.toUpperCase())}</Chip>
            ))}
          </div>
        ) : (
          <p className={QUIET}>{self ? "No skills yet. Add the ones you want Team Builders to find you by." : "No skills listed yet."}</p>
        )}
      </Section>
    </div>
  );
}

/** Performance History: every evaluation, with the average on the title row, or a note that there are none yet. */
function HistoryTab({ history, self, first }: { history: PastEvaluation[]; self: boolean; first: string }) {
  return (
    <Section title="Performance History" action={history.length > 0 && <Rating history={history} />}>
      {history.length ? (
        <div className="flex flex-col">
          {keyed(history, (h) => `${h.company}-${h.date}`).map(({ item: h, key }) => (
            <Evaluation key={key} evaluation={h} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No evaluations yet"
          body={self ? "When a Team Builder evaluates your trial or full-time work, the company, role, rating and feedback show up here, read-only." : `${first} hasn't been evaluated on Hireable yet. Evaluations appear here once a Team Builder sends one.`}
        />
      )}
    </Section>
  );
}

/** Portfolio: the portfolio, website and LinkedIn links, one row each. */
function PortfolioTab({ links, edit, editor }: { links: TalentProfileData["links"]; edit?: ReactNode; editor?: ReactNode }) {
  return (
    <Section title="Portfolio" edit={edit} editor={editor}>
      <LinkList
        links={[
          { label: "Portfolio", value: links.portfolio, icon: <Work size={20} aria-hidden className="text-ink-2" /> },
          { label: "Website", value: links.website, icon: WEBSITE },
          { label: "LinkedIn", value: links.linkedin, icon: LINKEDIN },
        ]}
      />
    </Section>
  );
}

/**
 * Contra's stat strip: rate, experience and rating, read at a glance before the
 * detail. A rating needs evaluations, so a talent without any reads as new to Hireable.
 */
function Facts({ rate, level, history }: { rate: string; level: string; history: PastEvaluation[] }) {
  const [, tier = level, years = "Experience"] = level.match(/^(.*?)\s*\((.+)\)$/) ?? [];
  const average = history.length ? history.reduce((n, h) => n + h.stars, 0) / history.length : 0;
  const cells: { label: string; value: ReactNode }[] = [
    { value: `$${rate.replace(/^\$\s*/, "").replace(/\s*\/\s*mo(nth)?$/i, "").trim()}`, label: "per month" },
    { value: tier, label: years },
    history.length
      ? {
          value: (
            <>
              <Star size={18} aria-hidden className="shrink-0 text-[#f2c94c]" />
              {average.toFixed(1)}
            </>
          ),
          label: plural(history.length, "evaluation"),
        }
      : { value: "New", label: "Not rated yet" },
  ];
  return <FactStrip cells={cells} className="max-w-[480px]" />;
}

/**
 * The intro card: the talent's own video when they've added one, the still otherwise; the
 * whole card plays it. It fills the box the hero gives it — 4:5 beside the header, or running down beside the tabs.
 */
function IntroVideo({ still, video, name, onPlay }: { still?: string; video?: string; name: string; onPlay: () => void }) {
  const zoom = "transition duration-300 group-hover:scale-[1.03]";
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${name}'s intro video`}
      className="group absolute inset-0 block overflow-hidden rounded-lg bg-[#d2d8db] outline -outline-offset-1 outline-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {video ? (
        // A frame from the talent's own video (a tenth of a second in, so there's a picture rather than black).
        <video src={`${video}#t=0.1`} muted playsInline preload="metadata" className={`absolute inset-0 size-full object-cover ${zoom}`} />
      ) : (
        // Above the fold and the page's largest paint: load it straight away rather than lazily.
        still && <Image src={still} alt="" fill sizes="384px" loading="eager" className={`object-cover object-top ${zoom}`} />
      )}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 to-transparent" />
      <span aria-hidden className="absolute bottom-4 left-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-white pr-3.5 pl-1.5 text-[13px] leading-none font-medium text-ink shadow-[0_2px_8px_rgba(0,0,0,.15)]">
        <Play size={24} className="text-primary" />
        Watch intro
      </span>
    </button>
  );
}

/** The link buttons beside the location: a 28px white circle, p 4, around the site's own icon, with a faint ring so it reads as a button. */
function IconLink({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Tip label={bare(value)}>
      <a
        href={hrefOf(value)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${label}: ${bare(value)}`}
        className="flex size-7 items-center justify-center rounded-full bg-white p-1 outline -outline-offset-1 outline-[#e5e5e5] transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {icon}
      </a>
    </Tip>
  );
}

/** Contra's review summary: the average rating and how many evaluations it is over. */
function Rating({ history }: { history: PastEvaluation[] }) {
  const average = history.reduce((n, h) => n + h.stars, 0) / history.length;
  return (
    <span className="flex items-center gap-1 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-nowrap text-ink-2">
      <Star size={16} aria-hidden className="text-[#f2c94c]" />
      <span className="font-semibold text-ink">{average.toFixed(1)}</span>
      <span>· {plural(history.length, "evaluation")}</span>
    </span>
  );
}

function Evaluation({ evaluation: e }: { evaluation: PastEvaluation }) {
  return (
    <article className="flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{e.role}</h4>
        <JobBadge type={e.type} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-[#757575]">
          {e.company} · {e.date}
        </p>
        <Stars value={e.stars} />
      </div>
      <p className={BODY}>{e.feedback}</p>
    </article>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="flex items-center gap-[2.667px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} aria-hidden className={n <= value ? "text-[#f2c94c]" : "text-[#d8d8d8]"} />
      ))}
    </span>
  );
}

/** The links Team Builders can open from the profile, one row each, or a note that one hasn't been added. */
function LinkList({ links }: { links: { label: string; value: string; icon: ReactNode }[] }) {
  return (
    <ul className="flex max-w-[768px] flex-col rounded-lg bg-white outline -outline-offset-1 outline-border">
      {links.map(({ label, value, icon }, i) => {
        const row = (
          <>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2">{icon}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[12px] leading-[1.2] font-medium tracking-[0.2px] text-ink-2">{label}</span>
              <span className={`truncate text-[14px] leading-[1.2] font-medium tracking-[0.2px] ${value ? "text-primary" : "text-ink-2"}`}>{value ? bare(value) : "Not added"}</span>
            </span>
            {value && <Out size={16} aria-hidden className="shrink-0 text-ink-2 transition group-hover:text-primary" />}
          </>
        );
        const box = `flex items-center gap-3 px-4 py-3 ${i ? "shadow-[inset_0_1px_0_#e5e5e5]" : ""}`;
        return (
          <li key={label}>
            {value ? (
              <a href={hrefOf(value)} target="_blank" rel="noreferrer" className={`group transition hover:bg-surface-alt ${box} ${i === 0 ? "rounded-t-lg" : ""} ${i === links.length - 1 ? "rounded-b-lg" : ""}`}>
                {row}
              </a>
            ) : (
              <div className={box}>{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
