"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Avatar, Button, Chip, Drawer, LinkButton, MatchPill, Toast } from "@/components/portal/ui";
import { useWithReturn } from "@/components/portal/return";
import { TalentProfile, type TalentProfileData } from "@/components/portal/talent-profile";
import { Tip } from "@/components/portal/tip";
import { contractTypeOf, evaluationsOf, pastEvaluations, useDeal, type Deal, type PastEvaluation } from "@/lib/demo/deal";
import { useIntroVideo } from "@/lib/demo/intro";
import { PAIR } from "@/lib/demo/live";
import { usePortfolio, type Sample } from "@/lib/demo/portfolio";
import { traitTagsFor } from "@/lib/demo/work-style";
import { MATCH_TOOLTIP } from "@/lib/portal/match";
import { useToast } from "@/lib/portal/toast";
import { pipelineHref } from "@/lib/team/data";
import type { Independent } from "@/lib/team/data";
import { useHired } from "@/lib/team/hired";
import { useSavedTalent } from "@/lib/team/saved";
import { usePipeline } from "@/lib/team/pipeline";
import { toggleSavedWithNote } from "@/components/portal/notify";

/**
 * A match on Discover and Saved Independents (and a new role's best matches): who they are
 * ("Juan D." until hired), their headline and match, the facts, and Save, Invite to apply and their
 * place in the pipeline. The name opens their profile in the preview sheet, the one profile a Team
 * Builder reads before a hire.
 */
export function IndependentCard({ person, onInvite, onOpen }: { person: Independent; onInvite: () => void; onOpen: (p: Independent) => void }) {
  const { nameOf } = useHired();
  return (
    <article className="flex flex-col gap-3 rounded-lg bg-white p-5 outline -outline-offset-1 outline-border">
      {/* On a phone the actions drop under the name, full width. */}
      <div className="flex items-center gap-3 max-sm:flex-wrap">
        <Avatar src={person.avatar} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* A line of text, so a touch screen gives it a finger's height to tap (hit-area). */}
          <button type="button" onClick={() => onOpen(person)} className="hit-area self-start text-[14px] leading-[1.4] font-medium text-primary hover:underline">
            {nameOf(person)}
          </button>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[18px] leading-[1.4] font-semibold text-ink">{person.role}</span>
            <MatchPill pct={person.match} coded title={MATCH_TOOLTIP.team} />
          </div>
        </div>
        <IndependentCardActions person={person} onInvite={onInvite} />
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
 * The card's actions, the same on Discover and on the saved list: the bookmark, which saves or
 * unsaves on the spot (unsaving says so, with Undo), then their column on the role's board once
 * they're a candidate, and Invite to apply, always the main action: a role they aren't on yet.
 */
function IndependentCardActions({ person, onInvite }: { person: Independent; onInvite: () => void }) {
  const { pipelineOf } = usePipeline();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  return (
    <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:[&>a]:h-10 max-sm:[&>a]:flex-1 max-sm:[&>button]:h-10 max-sm:[&>button:last-child]:flex-1">
      <SaveToggle person={person} />
      {inPipeline && (
        <LinkButton size="sm" href={withReturn(pipelineHref(inPipeline))}>
          View in pipeline
        </LinkButton>
      )}
      <Button size="sm" variant="primary" onClick={onInvite}>
        Invite to apply
      </Button>
    </div>
  );
}

/**
 * The card's bookmark: saves them, or takes them off the saved list at once, with Undo in the toast.
 * Drawn 28px beside the card's buttons from a tablet up, so a touch screen gives it a finger-sized
 * tap round it (hit-area); a phone draws it at the buttons' height.
 */
function SaveToggle({ person }: { person: Independent }) {
  const { saved, toggleSaved } = useSavedTalent();
  const { nameOf } = useHired();
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <Tip label={isSaved ? "Unsave" : "Save"}>
      <button
        type="button"
        aria-label={isSaved ? "Unsave Independent" : "Save Independent"}
        aria-pressed={isSaved}
        onClick={() => toggleSavedWithNote(nameOf(person), isSaved, () => toggleSaved(person.slug))}
        className="hit-area flex size-7 shrink-0 items-center justify-center rounded-full border-[1.167px] border-primary bg-white text-primary max-sm:size-10"
      >
        <Mark size={16} aria-hidden />
      </button>
    </Tip>
  );
}

/**
 * An Independent's profile, the one a Team Builder reads (Discover, Saved, Messages, the pipeline):
 * the same Contra-style profile as the talent's own view, in a sheet that slides in, with the hero
 * (Invite / Save, the facts, the intro) and the tabs all here. A role's pipeline opens it too: there
 * the candidate's page is one click away beside the photo (`href`), and the hero's buttons are the
 * pipeline's own (`actions`).
 */
export function ProfileDrawer({
  person,
  onClose,
  onInvite,
  href,
  actions,
}: {
  person: Independent | null;
  onClose: () => void;
  onInvite?: (p: Independent) => void;
  /** Where View profile goes, when there's more to see: the pipeline's candidate page. */
  href?: (p: Independent) => string;
  /** In place of Invite to apply / Save. */
  actions?: (p: Independent) => ReactNode;
}) {
  const withReturn = useWithReturn();
  /** The one on screen, kept while the sheet slides out so it doesn't empty mid-animation. */
  const [last, setLast] = useState(person);
  if (person && person.slug !== last?.slug) setLast(person);
  const p = person ?? last;
  const [toast, setToast] = useToast();
  return (
    <>
      {/* Focus starts on the close: the first control inside is the website link, whose tip popped up every time the sheet opened. */}
      <Drawer open={!!person} onClose={onClose} title="Independent profile" initialFocus="close">
        {p && (
          <TeamProfile
            person={p}
            onInvite={onInvite && (() => onInvite(p))}
            actions={actions?.(p)}
            onPlayIntro={() => setToast("Intro video plays here", "info")}
            inSheet
            photoAction={href && <ViewProfileLink href={withReturn(href(p))} />}
          />
        )}
      </Drawer>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/**
 * Beside the photo in the pipeline's sheet: a plain ink link, not a button or the brand blue, as it
 * leaves the sheet for the candidate's page. No underline on hover — the arrow nudges the way it points instead.
 */
function ViewProfileLink({ href }: { href: string }) {
  const Out = ICONS.northEast;
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 rounded-sm text-[14px] leading-[1.2] font-medium tracking-[0.2px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      View profile
      <Out
        size={16}
        aria-hidden
        className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}

/** The live pair's evaluations: the live engagement's first, then the ones from before it. */
function pairHistory(deal: Deal | null): PastEvaluation[] {
  return [
    ...(deal ? evaluationsOf(deal.contract).map((e) => ({ company: deal.company, role: deal.title, type: contractTypeOf(deal), date: e.date, stars: e.stars, feedback: e.feedback })) : []),
    ...pastEvaluations,
  ];
}

/** The Team Builder's record of a talent, as TalentProfile draws it — with the intro video, work samples and history only the live pair has. */
function profileData(person: Independent, introVideo: string | undefined, samples: Sample[], history: PastEvaluation[]): TalentProfileData {
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
    samples,
    history,
  };
}

/**
 * A talent's profile as a Team Builder reads it (IN-060): the talent's own TalentProfile, with the
 * match beside the name and Invite to apply / Save as the actions. Their work style is the tags
 * under About. Until they're hired it reads "Juan D." with no website, LinkedIn or portfolio link;
 * the work samples they uploaded show either way.
 * The preview sheet keeps its tab to itself; a role's candidate page puts its stage buttons in the
 * hero and its pipeline in the aside.
 */
export function TeamProfile({
  person,
  hired,
  onInvite,
  onPlayIntro,
  inSheet = false,
  actions,
  note,
  aside,
  photoAction,
}: {
  person: Independent;
  /** Whether this Team Builder has hired them (the offer is signed); read off their contracts when not given. */
  hired?: boolean;
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
  const contracted = useHired().hired(person.slug);
  const pair = person.slug === PAIR.independent.slug;
  /** The intro video the live pair added to their own profile, which plays here too. */
  const introVideo = useIntroVideo();
  /** The work samples the live pair uploaded to their own profile (#355, #311). */
  const samples = usePortfolio();
  /** The live pair's evaluations are the ones the talent's own profile lists; nobody else has any on Hireable yet. */
  const history = pair ? pairHistory(deal) : [];
  return (
    <TalentProfile
      viewer="team"
      hired={hired ?? contracted}
      person={profileData(person, pair ? (introVideo ?? undefined) : undefined, pair ? samples : [], history)}
      // The same gradient match pill as the Discover cards, at the header's size.
      badge={<MatchPill pct={person.match} title={MATCH_TOOLTIP.team} size="lg" />}
      actions={actions ?? <TeamProfileActions person={person} onInvite={onInvite} />}
      note={note}
      onPlayIntro={onPlayIntro}
      aside={aside}
      photoAction={photoAction}
      tabInUrl={!inSheet}
    />
  );
}

/**
 * Invite to apply, the main action wherever the sheet can invite (Discover and Saved), beside their
 * column on the role's board once they're a candidate, and Save.
 */
function TeamProfileActions({ person, onInvite }: { person: Independent; onInvite?: () => void }) {
  const { pipelineOf } = usePipeline();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  return (
    <>
      {onInvite && (
        <Button variant="primary" onClick={onInvite}>
          Invite to apply
        </Button>
      )}
      {inPipeline && (
        <LinkButton variant={onInvite ? "secondary" : "primary"} href={withReturn(pipelineHref(inPipeline))}>
          View in pipeline
        </LinkButton>
      )}
      <SaveButton person={person} />
    </>
  );
}

/** Save / Saved beside a profile's other actions. */
export function SaveButton({ person }: { person: Independent }) {
  const { saved, toggleSaved } = useSavedTalent();
  const { nameOf } = useHired();
  const isSaved = saved.includes(person.slug);
  const Mark = isSaved ? ICONS.bookmark : ICONS.saved;
  return (
    <Button onClick={() => toggleSavedWithNote(nameOf(person), isSaved, () => toggleSaved(person.slug))}>
      <Mark size={18} aria-hidden className={isSaved ? "text-primary" : "text-ink-2"} />
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
